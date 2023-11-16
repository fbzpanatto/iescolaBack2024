import { GenericController } from "./genericController";
import {EntityTarget, FindManyOptions, ILike, IsNull, ObjectLiteral, SaveOptions} from "typeorm";
import { Year } from "../model/Year";
import { Bimester } from "../model/Bimester";
import { Period } from "../model/Period";
import { AppDataSource } from "../data-source";
import {Request} from "express";
import {personCategories} from "../utils/personCategories";
import {StudentClassroom} from "../model/StudentClassroom";

// TODO: send endedAt date for the year on the front end before sending body post
// TODO: set studentClassroom active to false for all studentClassrooms

class YearController extends GenericController<EntityTarget<Year>> {
  constructor() { super(Year) }

  override async findAllWhere(options: FindManyOptions<ObjectLiteral> | undefined, request?: Request) {

    const search = request?.query.search as string

    try {

      const result = await this.repository.find({
        relations: ['periods.bimester'],
        order: { name: 'DESC', periods: { bimester: { id: 'ASC' } } },
        where: { name: ILike(`%${search}%`) }
      });

      return { status: 200, data: result };

    } catch (error: any) { return { status: 500, message: error.message } }
  }

  override async save(body: any, options: SaveOptions | undefined) {
    try {

      const teacher = await this.teacherByUser(body.user.user)
      const canCreate = [personCategories.ADMINISTRADOR, personCategories.SUPERVISOR]

      if(!canCreate.includes(teacher.person.category.id)) {
        return { status: 403, message: 'Você não tem permissão para criar um ano letivo. Solicite a um Administrador do sistema.' }
      }

      const yearExists = await this.checkIfExists(body)
      if (yearExists && yearExists.name === body.name) { return { status: 404, message: `O ano ${body.name} já existe.` } }

      const currentYear = await this.currentYear() as Year
      if(currentYear && currentYear.active && body.active) { return { status: 404, message: `O ano ${currentYear.name} está ativo. Encerre-o antes de criar um novo.` } }

      if(isNaN(Number(body.name))) { return { status: 404, message: `O ano ${body.name} não é um número.` } }

      const newYear = new Year();
      newYear.name = body.name;
      newYear.active = body.active;
      newYear.createdAt = body.createdAt ?? new Date()
      newYear.endedAt = body.endedAt ?? null

      const bimesters = await AppDataSource.getRepository(Bimester).find() as Bimester[]

      for(let bimester of bimesters) {
        const period = new Period();
        period.year = newYear  as Year;
        period.bimester = bimester;

        await AppDataSource.getRepository(Period).save(period)
      }

      return { status: 201, data: newYear };

    } catch (error: any) { return { status: 500, message: error.message } }
  }

  async updateId(id: any, body: any) {
    try {

      const { data} = await this.findOneById(id, {});
      const yearToUpdate = data

      if (!yearToUpdate) { return { status: 404, message: 'Data not found' } }

      const yearExists = await this.checkIfExists(body)
      if(yearExists && yearExists.name === body.name && yearExists.id !== yearToUpdate.id) { return { status: 404, message: `O ano ${body.name} já existe.` } }

      const currentYear = await this.currentYear() as Year
      if(currentYear && currentYear.active && body.active) { return { status: 404, message: `O ano ${currentYear.name} está ativo.` } }

      for (const prop in body) { yearToUpdate[prop] = body[prop as keyof Year] }

      if(!body.active && body.endedAt === '' || body.endedAt === null) { return { status: 404, message: 'Data de encerramento não pode ser vazia.'} }

      if(!body.active && body.endedAt) {

        const allStudentsClassroomsYear = await AppDataSource.getRepository(StudentClassroom)
          .createQueryBuilder('studentClassroom')
          .leftJoin('studentClassroom.year', 'year')
          .where('year.id = :yearId', { yearId: data.id })
          .andWhere('studentClassroom.endedAt IS NULL')
          .getMany()

        for(let register of allStudentsClassroomsYear) {
          await AppDataSource.getRepository(StudentClassroom).save({ ...register, endedAt: new Date()})
        }
      }

      const result = await this.repository.save(yearToUpdate);

      return { status: 200, data: result };

    } catch (error: any) { return { status: 500, message: error.message } }
  }

  async currentYear() {
    const result = await this.findOneByWhere({ where: { active: true, endedAt: IsNull() } });
    return result.data as Year;
  }

  async checkIfExists(body: Year) {
    const result = await this.findOneByWhere({ where: { name: body.name }})
    return result.data as Year;
  }
}

export const yearController = new YearController();

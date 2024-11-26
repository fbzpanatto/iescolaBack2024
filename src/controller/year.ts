import { GenericController } from "./genericController";
import { EntityManager, EntityTarget, FindManyOptions, ILike, IsNull, ObjectLiteral, SaveOptions } from "typeorm";
import { Year } from "../model/Year";
import { Bimester } from "../model/Bimester";
import { Period } from "../model/Period";
import { AppDataSource } from "../data-source";
import { Request } from "express";
import { pc } from "../utils/personCategories";
import { StudentClassroom } from "../model/StudentClassroom";
import {dbConn} from "../services/db";

class YearController extends GenericController<EntityTarget<Year>> {
  constructor() { super(Year) }

  override async findAllWhere(options: FindManyOptions<ObjectLiteral> | undefined, request?: Request) {
    const search = request?.query.search as string
    try {
      return await AppDataSource.transaction(async(CONN)=>{
        const data = await CONN.find(Year,{ relations: ['periods.bimester'], order: { name: 'DESC', periods: { bimester: { id: 'ASC' } } }, where: { name: ILike(`%${ search }%`) }})
        return { status: 200, data };
      })
    } catch (error: any) { return { status: 500, message: error.message } }
  }

  override async save(body: any) {

    let sqlConnection = await dbConn()

    try {
      return await AppDataSource.transaction(async(CONN)=> {

        const qUserTeacher = await this.qTeacherByUser(sqlConnection, body.user.user)
        const canCreate = [pc.ADMN]
        if (!canCreate.includes(qUserTeacher.person.category.id)) { return { status: 403, message: 'Você não tem permissão para criar um ano letivo. Solicite a um Administrador do sistema.' }}
        const yearExists = await this.checkIfExists(body, CONN)
        if (yearExists && yearExists.name === body.name) { return { status: 404, message: `O ano ${body.name} já existe.` } }
        const currentYear = await this.currentYear(CONN) as Year
        if (currentYear && currentYear.active && body.active) { return { status: 404, message: `O ano ${currentYear.name} está ativo. Encerre-o antes de criar um novo.` } }
        const baseYear = await CONN.getRepository(Year)
          .createQueryBuilder('year')
          .select('MAX(CAST(year.name AS UNSIGNED))', 'maxValue')
          .getRawOne();
        const toNewYear = Number(baseYear.maxValue) + 1
        const newYear = new Year(); newYear.name = toNewYear.toString(); newYear.active = true; newYear.createdAt = body.createdAt ?? new Date(); newYear.endedAt = body.endedAt ?? null
        const registers = await CONN.find(Bimester)
        for (let el of registers) { await CONN.save(Period, { year: newYear, bimester: el } as Period) }
        return { status: 201, data: newYear };
      })
    }
    catch (error: any) { return { status: 500, message: error.message } }
    finally { if(sqlConnection) { sqlConnection.release() } }
  }

  async updateId(id: any, body: any) {

    try {
      return await AppDataSource.transaction(async(CONN) => {
        const { data } = await this.findOneById(id, {}, CONN);
        const yearToUpdate = data
        if (!yearToUpdate) { return { status: 404, message: 'Data not found' } }
        const yearExists = await this.checkIfExists(body, CONN)
        if (yearExists && yearExists.name === body.name && yearExists.id !== yearToUpdate.id) { return { status: 400, message: `O ano ${body.name} já existe.` } }
        const currentYear = await this.currentYear(CONN)
        if (currentYear && currentYear.active && body.active) { return { status: 400, message: `O ano ${currentYear.name} está ativo.` } }
        for (const prop in body) { yearToUpdate[prop] = body[prop as keyof Year] }
        if (!body.active && body.endedAt === '' || body.endedAt === null) { return { status: 400, message: 'Data de encerramento não pode ser vazia.' } }
        if (!body.active && body.endedAt) {
          const allStudentsClassroomsYear = await CONN.getRepository(StudentClassroom)
            .createQueryBuilder('studentClassroom')
            .leftJoin('studentClassroom.year', 'year')
            .where('year.id = :yearId', { yearId: data.id })
            .andWhere('studentClassroom.endedAt IS NULL')
            .getMany()
          for (let register of allStudentsClassroomsYear) { await CONN.getRepository(StudentClassroom).save({ ...register, endedAt: new Date() }) }
        }
        const result = await CONN.save(Year, yearToUpdate); return { status: 200, data: result };
      })
    } catch (error: any) { return { status: 500, message: error.message } }
  }

  async currentYear(CONN: EntityManager) { return (await this.findOneByWhere({ where: { active: true, endedAt: IsNull() } }, CONN)).data as Year }
  async checkIfExists(body: Year, CONN: EntityManager) { return (await this.findOneByWhere({ where: { name: body.name } }, CONN)).data as Year }
}

export const yearController = new YearController();

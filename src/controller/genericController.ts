import { ObjectLiteral, EntityTarget, FindOneOptions, DeepPartial, SaveOptions, FindManyOptions, IsNull} from "typeorm";
import { AppDataSource } from "../data-source";
import { Person } from "../model/Person";
import { SavePerson } from "../interfaces/interfaces";
import { Year } from "../model/Year";
import { Classroom } from "../model/Classroom";
import { State } from "../model/State";
import { Request } from "express";
import {TransferStatus} from "../model/TransferStatus";
import {Teacher} from "../model/Teacher";

export class GenericController<T> {
  constructor(private entity: EntityTarget<ObjectLiteral>) {}

  async findAllWhere(options: FindManyOptions<ObjectLiteral> | undefined, request?: Request) {
    try {
      const result = await this.repository.find();
      return { status: 200, data: result };
    } catch (error: any) { return { status: 500, message: error.message } }
  }
  async findOneByWhere(options: FindOneOptions<ObjectLiteral>) {
    try {
      const result = await this.repository.findOne(options);
      if (!result) { return { status: 404, message: 'Data not found' } }
      return { status: 200, data: result };
    } catch (error: any) { return { status: 500, message: error.message } }
  }
  async findOneById(id: string | number) {
    try {
      const result = await this.repository.findOneBy({ id: id });
      if (!result) { return { status: 404, message: 'Data not found' } }
      return { status: 200, data: result };
    } catch (error: any) { return { status: 500, message: error.message } }
  }
  async save(body: DeepPartial<ObjectLiteral>, options: SaveOptions | undefined) {
    try {
      const result = await this.repository.save(body, options);
      return { status: 201, data: result };
    } catch (error: any) { return { status: 500, message: error.message } }
  }
  async updateId(id: number | string, body: ObjectLiteral) {
    try {
      const dataInDataBase = await this.repository.findOneBy({ id: id });
      if (!dataInDataBase) { return { status: 404, message: 'Data not found' } }
      for (const key in body) { dataInDataBase[key] = body[key] }
      const result = await this.repository.save(dataInDataBase);
      return { status: 200, data: result };
    } catch (error: any) { return { status: 500, message: error.message } }
  }
  async deleteId(id: any) {
    try {
      const dataToDelete = await this.repository.findOneBy({ id: id });
      if (!dataToDelete) { return { status: 404, message: 'Data not found' } }
      const result = await this.repository.delete(dataToDelete);
      return { status: 200, data: result };
    } catch (error: any) { return { status: 500, message: error.message } }
  }
  get repository() { return AppDataSource.getRepository(this.entity) }


  createPerson(body: SavePerson) {
    const person = new Person()
    person.name = body.name
    person.birth = body.birth
    person.category = body.category
    return person
  }
  async currentYear() {
    return await AppDataSource.getRepository(Year).findOne({ where: { endedAt: IsNull(), active: true } } ) as Year
  }
  async classroom(id: number) {
    return await AppDataSource.getRepository(Classroom).findOne({where: {id: id}}) as Classroom
  }
  async state(id: number) {
    return await AppDataSource.getRepository(State).findOne({where: {id: id}}) as State
  }
  async transferStatus(id: number) {
    return await AppDataSource.getRepository(TransferStatus).findOne({where: {id: id}}) as TransferStatus
  }
  async teacherByUser(userId: number) {
    return await AppDataSource.getRepository(Teacher).findOne({
      relations: ['person.category'],
      where: { person: { user: { id: userId } } },
    }) as Teacher
  }
  async teacherClassrooms(body: { user: number }) {
    const result = await AppDataSource
      .createQueryBuilder()
      .select('teacher.id', 'teacher' )
      .addSelect('GROUP_CONCAT(DISTINCT classroom.id ORDER BY classroom.id ASC)', 'classrooms')
      .from(Teacher, 'teacher')
      .leftJoin('teacher.person', 'person')
      .leftJoin('person.user', 'user')
      .leftJoin('teacher.teacherClassDiscipline', 'teacherClassDiscipline')
      .leftJoin('teacherClassDiscipline.classroom', 'classroom')
      .where('user.id = :userId AND teacherClassDiscipline.endedAt IS NULL', { userId: body.user })
      .groupBy('teacher.id')
      .getRawOne() as { teacher: number, classrooms: string }

    return {
      id: result.teacher,
      classrooms: result.classrooms?.split(',').map((classroomId: string) => Number(classroomId)) ?? [],
    }
  }

  async teacherDisciplines(body: { user: number }) {
    const result = await AppDataSource
      .createQueryBuilder()
      .select('teacher.id', 'teacher' )
      .addSelect('GROUP_CONCAT(DISTINCT discipline.id ORDER BY discipline.id ASC)', 'disciplines')
      .from(Teacher, 'teacher')
      .leftJoin('teacher.person', 'person')
      .leftJoin('person.user', 'user')
      .leftJoin('teacher.teacherClassDiscipline', 'teacherClassDiscipline')
      .leftJoin('teacherClassDiscipline.discipline', 'discipline')
      .where('user.id = :userId AND teacherClassDiscipline.endedAt IS NULL', { userId: body.user })
      .groupBy('teacher.id')
      .getRawOne() as { teacher: number, disciplines: string }

    return {
      id: result.teacher,
      disciplines: result.disciplines?.split(',').map((disciplineId: string) => Number(disciplineId)) ?? [],
    }
  }
}

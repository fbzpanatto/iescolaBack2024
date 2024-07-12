import {
  DeepPartial,
  EntityManager,
  EntityTarget,
  FindManyOptions,
  FindOneOptions,
  IsNull,
  ObjectLiteral,
  SaveOptions,
} from "typeorm";
import { AppDataSource } from "../data-source";
import { Person } from "../model/Person";
import { SavePerson } from "../interfaces/interfaces";
import { Year } from "../model/Year";
import { Classroom } from "../model/Classroom";
import { State } from "../model/State";
import { Request } from "express";
import { TransferStatus } from "../model/TransferStatus";
import { Teacher } from "../model/Teacher";

export class GenericController<T> {
  constructor(private entity: EntityTarget<ObjectLiteral>) {}

  get repository() { return AppDataSource.getRepository(this.entity) }

  async findAllWhere( options: FindManyOptions<ObjectLiteral> | undefined, request?: Request, transaction?: EntityManager ) {
    try {

      if(!transaction){ const result = await this.repository.find(); return { status: 200, data: result } }

      const result = await transaction.find(this.entity); return { status: 200, data: result }

    } catch (error: any) { return { status: 500, message: error.message } }
  }

  async findOneByWhere(options: FindOneOptions<ObjectLiteral>) {
    try {
      const result = await this.repository.findOne(options)
      if (!result) { return { status: 404, message: "Data not found" } }
      return { status: 200, data: result };
    } catch (error: any) { return { status: 500, message: error.message } }
  }

  async findOneById(id: number | string, body: ObjectLiteral, transaction?: EntityManager) {
    try {

      if(!transaction) {
        const result = await this.repository.findOneBy({ id: id });
        if (!result) { return { status: 404, message: "Data not found" } }
        return { status: 200, data: result };
      }

      const result = await transaction.findOneBy(this.entity, { id: id });
      if (!result) { return { status: 404, message: "Data not found" } }
      return { status: 200, data: result };
      
    } catch (error: any) { return { status: 500, message: error.message } }
  }

  async save(
    body: DeepPartial<ObjectLiteral>,
    options: SaveOptions | undefined,
  ) {
    try {
      const result = await this.repository.save(body, options);
      return { status: 201, data: result };
    } catch (error: any) {
      return { status: 500, message: error.message };
    }
  }

  async updateId(id: number | string, body: ObjectLiteral) {
    try {
      const dataInDataBase = await this.repository.findOneBy({ id: id });
      if (!dataInDataBase) {
        return { status: 404, message: "Data not found" };
      }
      for (const key in body) {
        dataInDataBase[key] = body[key];
      }
      const result = await this.repository.save(dataInDataBase);
      return { status: 200, data: result };
    } catch (error: any) {
      return { status: 500, message: error.message };
    }
  }

  async deleteId(id: any) {
    try {
      const dataToDelete = await this.repository.findOneBy({ id: id });
      if (!dataToDelete) {
        return { status: 404, message: "Data not found" };
      }
      const result = await this.repository.delete(dataToDelete);
      return { status: 200, data: result };
    } catch (error: any) {
      return { status: 500, message: error.message };
    }
  }

  createPerson(body: SavePerson) {
    const person = new Person();
    person.name = body.name;
    person.birth = body.birth;
    person.category = body.category;
    return person;
  }

  async currentYear(CONN?: EntityManager) {
    if(!CONN) { return (await AppDataSource.getRepository(Year).findOne({ where: { endedAt: IsNull(), active: true } })) as Year }
    return await CONN.findOne(Year, { where: { endedAt: IsNull(), active: true } }) as Year
  }

  async classroom(id: number, CONN?: EntityManager) {
    if(!CONN) { return (await AppDataSource.getRepository(Classroom).findOne({ where: { id: id } })) as Classroom }
    return await CONN.findOne(Classroom, { where: { id: id } }) as Classroom
  }

  async state(id: number, CONN?: EntityManager) {
    if(!CONN) { return (await AppDataSource.getRepository(State).findOne({ where: { id: id } })) as State }
    return await CONN.findOne(State, { where: { id: id } }) as State
  }

  async transferStatus(id: number) { return (await AppDataSource.getRepository(TransferStatus).findOne({ where: { id: id } })) as TransferStatus }

  async teacherByUser(userId: number, conn?: EntityManager) {
    const options = { relations: ["person.category", "person.user"], where: { person: { user: { id: userId } } } }
    if(!conn) { return (await AppDataSource.getRepository(Teacher).findOne(options)) as Teacher }
    return await conn.findOne(Teacher, options) as Teacher
  }

  async teacherClassrooms(body: { user: number }, conn?: EntityManager) {

    if(!conn) {
      const result = (await AppDataSource.createQueryBuilder()
      .select("teacher.id", "teacher")
      .addSelect("GROUP_CONCAT(DISTINCT classroom.id ORDER BY classroom.id ASC)", "classrooms" )
      .from(Teacher, "teacher")
      .leftJoin("teacher.person", "person")
      .leftJoin("person.user", "user")
      .leftJoin("teacher.teacherClassDiscipline", "teacherClassDiscipline")
      .leftJoin("teacherClassDiscipline.classroom", "classroom")
      .where("user.id = :userId AND teacherClassDiscipline.endedAt IS NULL", { userId: body.user })
      .groupBy("teacher.id")
      .getRawOne()) as { teacher: number; classrooms: string };

      return { id: result.teacher, classrooms: result.classrooms?.split(",").map((classroomId: string) => Number(classroomId)) ?? [] }
    }

    const result = (await conn.createQueryBuilder()
    .select("teacher.id", "teacher")
    .addSelect("GROUP_CONCAT(DISTINCT classroom.id ORDER BY classroom.id ASC)", "classrooms" )
    .from(Teacher, "teacher")
    .leftJoin("teacher.person", "person")
    .leftJoin("person.user", "user")
    .leftJoin("teacher.teacherClassDiscipline", "teacherClassDiscipline")
    .leftJoin("teacherClassDiscipline.classroom", "classroom")
    .where("user.id = :userId AND teacherClassDiscipline.endedAt IS NULL", { userId: body.user })
    .groupBy("teacher.id")
    .getRawOne()) as { teacher: number; classrooms: string };

    return { id: result.teacher, classrooms: result.classrooms?.split(",").map((classroomId: string) => Number(classroomId)) ?? [] }
  }

  async teacherDisciplines(body: { user: number }, transaction?: EntityManager) {
    if(!transaction) {
      const result = (await AppDataSource.createQueryBuilder()
      .select("teacher.id", "teacher")
      .addSelect("GROUP_CONCAT(DISTINCT discipline.id ORDER BY discipline.id ASC)", "disciplines" )
      .from(Teacher, "teacher")
      .leftJoin("teacher.person", "person")
      .leftJoin("person.user", "user")
      .leftJoin("teacher.teacherClassDiscipline", "teacherClassDiscipline")
      .leftJoin("teacherClassDiscipline.discipline", "discipline")
      .where("user.id = :userId AND teacherClassDiscipline.endedAt IS NULL", { userId: body.user })
      .groupBy("teacher.id")
      .getRawOne()) as { teacher: number; disciplines: string };

      return { id: result.teacher, disciplines: result.disciplines?.split(",").map((disciplineId: string) => Number(disciplineId)) ?? [] };
    }

    const result = (await transaction.createQueryBuilder()
    .select("teacher.id", "teacher")
    .addSelect("GROUP_CONCAT(DISTINCT discipline.id ORDER BY discipline.id ASC)", "disciplines" )
    .from(Teacher, "teacher")
    .leftJoin("teacher.person", "person")
    .leftJoin("person.user", "user")
    .leftJoin("teacher.teacherClassDiscipline", "teacherClassDiscipline")
    .leftJoin("teacherClassDiscipline.discipline", "discipline")
    .where("user.id = :userId AND teacherClassDiscipline.endedAt IS NULL", { userId: body.user })
    .groupBy("teacher.id")
    .getRawOne()) as { teacher: number; disciplines: string };
    
    return { id: result.teacher, disciplines: result.disciplines?.split(",").map((disciplineId: string) => Number(disciplineId)) ?? [] }
  }
}

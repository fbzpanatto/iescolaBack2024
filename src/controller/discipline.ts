import { GenericController } from "./genericController";
import { EntityTarget } from "typeorm";
import { Discipline } from "../model/Discipline";
import { Request } from "express";
import { JwtPayload } from "../interfaces/interfaces";
import { catalogRepository } from "../repositories/catalog.repository";
import { teacherRepository } from "../repositories/teacher.repository";

class DisciplineController extends GenericController<EntityTarget<Discipline>> {

  constructor() {
    super(Discipline, { table: 'discipline', selectColumns: ['id', 'name'] })
  }

  async getAllDisciplines(req: Request, authUser: JwtPayload) {

    try {
      const qUserTeacher = await teacherRepository.qTeacherByUser(authUser.user);
      const teacherDisciplines = await teacherRepository.qTeacherDisciplines(authUser.user);
      const result = await catalogRepository.qGetAllDisciplines(qUserTeacher, teacherDisciplines)
      return { status: 200, data: result };
    }
    catch (error: any) { console.error(error); return { status: 500, message: error.message } }
  }
}

export const discController = new DisciplineController();
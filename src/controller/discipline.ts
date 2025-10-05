import { GenericController } from "./genericController";
import { EntityTarget } from "typeorm";
import { Discipline } from "../model/Discipline";
import { Request } from "express";
import { TeacherBody } from "../interfaces/interfaces";

class DisciplineController extends GenericController<EntityTarget<Discipline>> {

  constructor() { super(Discipline) }

  async getAllDisciplines(req: Request) {

    const body = req?.body as TeacherBody;

    try {
      const qUserTeacher = await this.qTeacherByUser(body.user.user);
      const teacherDisciplines = await this.qTeacherDisciplines(req?.body.user.user);
      const result = await this.qGetAllDisciplines(qUserTeacher, teacherDisciplines)
      return { status: 200, data: result };
    }
    catch (error: any) { console.error(error); return { status: 500, message: error.message } }
  }
}

export const discController = new DisciplineController();
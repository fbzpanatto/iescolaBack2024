import { GenericController } from "./genericController";
import { EntityTarget } from "typeorm";
import { Classroom } from "../model/Classroom";
import { Request } from "express";
import { TeacherBody } from "../interfaces/interfaces";
import { pc } from "../utils/personCategories";

class ClassroomController extends GenericController<EntityTarget<Classroom>> {

  constructor() { super(Classroom) }

  async getAllClassrooms(request: Request) {
    const { body } = request as { body: TeacherBody };
    try {
      const qUserTeacher = await this.qTeacherByUser(body.user.user);
      const tClasses = await this.qTeacherClassrooms(request?.body.user.user);
      const allClassrooms = [...tClasses.classrooms, 1216, 1217, 1218];
      const masterUser = qUserTeacher.person.category.id === pc.ADMN || qUserTeacher.person.category.id === pc.SUPE || qUserTeacher.person.category.id === pc.FORM;
      const result = await this.getTeacherClassrooms(masterUser, allClassrooms) as Array<Classroom>
      return { status: 200, data: result };
    }
    catch (error: any) { console.error(error); return { status: 500, message: error.message } }
  }
}

export const classroomController = new ClassroomController();
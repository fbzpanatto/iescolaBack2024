import { GenericController } from "./genericController";
import { EntityTarget } from "typeorm";
import { Classroom } from "../model/Classroom";
import { Request } from "express";
import { qUserTeacher, TeacherBody } from "../interfaces/interfaces";
import { PERSON_CATEGORIES as pc } from "../utils/enums";

class ClassroomController extends GenericController<EntityTarget<Classroom>> {

  constructor() { super(Classroom) }

  async classroomForm(_: Request) {
    try {
      const categories = await this.qClassroomCategories()
      const shifts = await this.qClassroomShift()
      return { status: 200, data: { shifts, categories } };
    }
    catch (error: any) { console.error(error); return { status: 500, message: error.message } }
  }

  async getClassroom(req: Request) {
    try {
      const result = await this.qGetClassroomFullData(Number(req.params.id))
      return { status: 200, data: result };
    }
    catch (error: any) { console.error(error); return { status: 500, message: error.message } }
  }

  async getAllClassrooms(req: Request) {
    const { body } = req as { body: TeacherBody };

    const search = (req?.query.search as string) ?? "";
    const limit =  !isNaN(parseInt(req.query.limit as string)) ? parseInt(req.query.limit as string) : 100
    const offset =  !isNaN(parseInt(req.query.offset as string)) ? parseInt(req.query.offset as string) : 0

    try {
      const teacher = await this.qTeacherByUser(body.user.user);

      const tClasses = await this.qTeacherClassrooms(req?.body.user.user);

      const active = req.query.active === 'true'

      const includeOthers = req.query.others === 'false'

      const others = [1216, 1217, 1218]

      const allClassrooms = includeOthers ? [...tClasses.classrooms]: [...tClasses.classrooms, ...others]

      const result = await this.getTeacherClassrooms(this.isMasterUser(teacher), allClassrooms, search, limit, offset, active) as Array<Classroom>
      return { status: 200, data: result };
    }
    catch (error: any) { console.error(error); return { status: 500, message: error.message } }
  }

  async getAllClassroomsByTestCategory(req: Request) {

    const { body } = req as { body: TeacherBody };
    const { testCategory } = req.params;
    try {
      const teacher = await this.qTeacherByUser(body.user.user);
      const tClasses = await this.qTeacherClassrooms(req?.body.user.user);
      const allClassrooms = [...tClasses.classrooms, 1216, 1217, 1218];
      const { startClassroomNumber: start, endClassroomNumber: end } = await this.qTestCategory(Number(testCategory))
      const result = await this.getTeacherClassroomsByTestCategory(this.isMasterUser(teacher), allClassrooms, start, end)
      return { status: 200, data: result };
    }
    catch (error: any) { console.error(error); return { status: 500, message: error.message } }
  }

  isMasterUser(u: qUserTeacher) {
    return u.person.category.id === pc.ADMN || u.person.category.id === pc.SUPE || u.person.category.id === pc.FORM;
  }
}

export const classroomController = new ClassroomController();
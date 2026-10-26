import { GenericController } from "./genericController";
import { EntityTarget } from "typeorm";
import { Classroom } from "../model/Classroom";
import { Request } from "express";
import { qUserTeacher, TeacherBody, JwtPayload } from "../interfaces/interfaces";
import { OUT_CLASSROOMS, PER_CAT as pc } from "../utils/enums";
import { catalogRepository } from "../repositories/catalog.repository";
import { teacherRepository } from "../repositories/teacher.repository";
import { classroomRepository } from "../repositories/classroom.repository";

class ClassroomController extends GenericController<EntityTarget<Classroom>> {

  constructor() {
    super(Classroom, {
      table: 'classroom',
      selectColumns: ['id', 'name', 'nickname', 'shortName'],
      relations: { school: 'schoolId', category: 'categoryId', shift: 'shiftId' }
    })
  }

  async classroomForm(_: Request) {
    try {
      const categories = await catalogRepository.qClassroomCategories(true)
      const shifts = await catalogRepository.qClassroomShift()
      return { status: 200, data: { shifts, categories } };
    }
    catch (error: any) { console.error(error); return { status: 500, message: error.message } }
  }

  async getClassroom(req: Request) {

    try {
      const result = await classroomRepository.qGetClassroomFullData(Number(req.params.id))

      return { status: 200, data: result };
    }
    catch (error: any) { console.error(error); return { status: 500, message: error.message } }
  }

  async getAllClassrooms(req: Request, authUser: JwtPayload) {
    const search = (req?.query.search as string) ?? "";
    const limit =  !isNaN(parseInt(req.query.limit as string)) ? parseInt(req.query.limit as string) : 100
    const offset =  !isNaN(parseInt(req.query.offset as string)) ? parseInt(req.query.offset as string) : 0

    try {
      const teacher = await teacherRepository.qTeacherByUser(authUser.user);

      const tClasses = await teacherRepository.qTeacherClassrooms(authUser.user);

      const active = req.query.active === 'true'

      const includeOthers = req.query.others === 'false'

      const isSuperEI = teacher.person.category.id === pc.SUPE_EI

      const allClassrooms = includeOthers ? [...tClasses.classrooms]: [...tClasses.classrooms, ...(OUT_CLASSROOMS)]

      const result = await classroomRepository.getTeacherClassrooms(isSuperEI, this.isMasterUser(teacher), allClassrooms, search, limit, offset, active) as Array<Classroom>
      return { status: 200, data: result };
    }
    catch (error: any) { console.error(error); return { status: 500, message: error.message } }
  }

  async getAllClassroomsByTestCategory(req: Request, authUser: JwtPayload) {
    const { testCategory } = req.params;
    try {
      const teacher = await teacherRepository.qTeacherByUser(authUser.user);
      const tClasses = await teacherRepository.qTeacherClassrooms(authUser.user);
      const allClassrooms = [...tClasses.classrooms, ...OUT_CLASSROOMS];
      const { startClassroomNumber: start, endClassroomNumber: end } = await catalogRepository.qTestCategory(Number(testCategory))
      const result = await classroomRepository.getTeacherClassroomsByTestCategory(this.isMasterUser(teacher), allClassrooms, start, end)
      return { status: 200, data: result };
    }
    catch (error: any) { console.error(error); return { status: 500, message: error.message } }
  }

  async putClassroomAndStudents(req: Request, authUser: JwtPayload) {
    const { body } = req as { body: any }

    try {
      const classroomId = body.id;
      const userId = authUser.user;

      await classroomRepository.qUpdateClassroom(classroomId, body.nickname, body.shift);

      if (body.studentsChanges && body.studentsChanges.length > 0) {
        await classroomRepository.qUpdateStudentRosters(body.studentsChanges, userId);
      }

      return { status: 200, data: { message: "Sala e alunos atualizados com sucesso." } };
    }
    catch (error: any) { console.error(error); return { status: 500, message: error.message } }
  }

  isMasterUser(u: qUserTeacher) {
    return u.person.category.id === pc.ADMN || u.person.category.id === pc.SUPE || u.person.category.id === pc.SUPE_EI || u.person.category.id === pc.FORM;
  }
}

export const classroomController = new ClassroomController();
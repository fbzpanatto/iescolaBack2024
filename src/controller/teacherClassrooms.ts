import { GenericController } from "./genericController";
import { EntityTarget } from "typeorm";
import { Classroom } from "../model/Classroom";
import { AppDataSource } from "../data-source";
import { Request } from "express";
import { PERSON_CATEGORIES } from "../utils/enums";

class TeacherClassroomsController extends GenericController<EntityTarget<Classroom>> {

  constructor() { super(Classroom) }

  async getAllTClass(request: Request) {

    const body = request?.body

    try {
      const qUserTeacher = await this.qTeacherByUser(body.user.user)
      const masterUser = qUserTeacher.person.category.id === PERSON_CATEGORIES.ADMN || qUserTeacher.person.category.id === PERSON_CATEGORIES.SUPE || qUserTeacher.person.category.id === PERSON_CATEGORIES.FORM

      const classrooms = await this.qAllTClass(masterUser, qUserTeacher.id)
      return { status: 200, data: classrooms };
    }
    catch (error: any) { return { status: 500, message: error.message } }
  }

  override async save(body: { id: number, classrooms: number[] }) {
    try {
      return await AppDataSource.transaction(async(CONN) => {
        const classrooms = await CONN.getRepository(Classroom)
        .createQueryBuilder('classroom')
        .select('classroom.id', 'id')
        .addSelect('classroom.shortName', 'name')
        .addSelect('school.shortName', 'school')
        .leftJoin('classroom.school', 'school')
        .where('classroom.id IN (:...ids)', { ids: body.classrooms })
        .getRawMany();

        return { status: 200, data: classrooms }
      })
    } catch (error: any) { return { status: 500, message: error.message } }
  }
}

export const teacherClassroomsController = new TeacherClassroomsController();

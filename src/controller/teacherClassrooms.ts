import { GenericController } from "./genericController";
import { Brackets, EntityManager, EntityTarget } from "typeorm";
import { Classroom } from "../model/Classroom";
import { AppDataSource } from "../data-source";
import { Request } from "express";
import { TeacherClassDiscipline } from "../model/TeacherClassDiscipline";
import { pc } from "../utils/personCategories";

class TeacherClassroomsController extends GenericController<EntityTarget<Classroom>> {

  constructor() { super(Classroom) }

  async getAllTClass(request: Request, CONN?: EntityManager) {

    const body = request?.body

    try {

      const teacher = await this.teacherByUser(body.user.user)
      const masterUser = teacher.person.category.id === pc.ADMN || teacher.person.category.id === pc.SUPE

      const fields = ['classroom.id as id', 'classroom.shortName as name', 'school.shortName as school']

      if(!CONN){
        if(masterUser) {
          const classrooms = await AppDataSource.getRepository(Classroom)
            .createQueryBuilder('classroom')
            .select(fields)
            .leftJoin('classroom.school', 'school')
            .groupBy( 'classroom.id')
            .getRawMany() as { id: number, name: string, school: string }[]

          return { status: 200, data: classrooms };
        }
        else {
          const classrooms = await AppDataSource.getRepository(TeacherClassDiscipline)
            .createQueryBuilder('teacherClassDiscipline')
            .select(fields)
            .leftJoin('teacherClassDiscipline.classroom', 'classroom')
            .leftJoin('classroom.school', 'school')
            .leftJoin('teacherClassDiscipline.teacher', 'teacher')
            .where('teacher.id = :id', { id: teacher.id })
            .andWhere(new Brackets(qb => { if(!masterUser) { qb.andWhere('teacherClassDiscipline.endedAt IS NULL') } }))
            .groupBy( 'classroom.id')
            .getRawMany() as { id: number, name: string, school: string }[]

          return { status: 200, data: classrooms };
        }
      }

      if(masterUser) {

        const classrooms = await CONN.getRepository(Classroom)
          .createQueryBuilder('classroom')
          .select(fields)
          .leftJoin('classroom.school', 'school')
          .groupBy( 'classroom.id')
          .getRawMany() as { id: number, name: string, school: string }[]

        return { status: 200, data: classrooms };
      }
      else {

        const classrooms = await CONN.getRepository(TeacherClassDiscipline)
          .createQueryBuilder('teacherClassDiscipline')
          .select(fields)
          .leftJoin('teacherClassDiscipline.classroom', 'classroom')
          .leftJoin('classroom.school', 'school')
          .leftJoin('teacherClassDiscipline.teacher', 'teacher')
          .where('teacher.id = :id', { id: teacher.id })
          .andWhere(new Brackets(qb => { if(!masterUser) { qb.andWhere('teacherClassDiscipline.endedAt IS NULL') } }))
          .groupBy( 'classroom.id')
          .getRawMany() as { id: number, name: string, school: string }[]

        return { status: 200, data: classrooms };
      }
    } catch (error: any) { return { status: 500, message: error.message } }
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

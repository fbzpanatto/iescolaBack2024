import { GenericController } from "./genericController";
import {Brackets, EntityTarget, FindManyOptions, ObjectLiteral} from "typeorm";
import { Classroom } from "../model/Classroom";
import { AppDataSource } from "../data-source";
import {Request} from "express";
import {TeacherClassDiscipline} from "../model/TeacherClassDiscipline";
import {pc} from "../utils/personCategories";

class TeacherClassroomsController extends GenericController<EntityTarget<Classroom>> {

  constructor() {
    super(Classroom);
  }

  async findAllWhere(options: FindManyOptions<ObjectLiteral> | undefined, request?: Request) {

    const body = request?.body

    try {

      const teacher = await this.teacherByUser(body.user.user)
      const isAdminSupervisor = teacher.person.category.id === pc.ADMINISTRADOR || teacher.person.category.id === pc.SUPERVISOR

      if(isAdminSupervisor) {

        const classrooms = await AppDataSource
          .getRepository(Classroom)
          .createQueryBuilder('classroom')
          .select([
            'classroom.id as id',
            'classroom.shortName as name',
            'school.shortName as school'
          ])
          .leftJoin('classroom.school', 'school')
          .groupBy( 'classroom.id')
          .getRawMany() as { id: number, name: string, school: string }[];

        return { status: 200, data: classrooms };
      } else {

        const classrooms = await AppDataSource.
        getRepository(TeacherClassDiscipline)
          .createQueryBuilder('teacherClassDiscipline')
          .select([
            'classroom.id as id',
            'classroom.shortName as name',
            'school.shortName as school'
          ])
          .leftJoin('teacherClassDiscipline.classroom', 'classroom')
          .leftJoin('classroom.school', 'school')
          .leftJoin('teacherClassDiscipline.teacher', 'teacher')
          .where('teacher.id = :id', { id: teacher.id })
          .andWhere(new Brackets(qb => {
            if(!isAdminSupervisor) {
              qb.andWhere('teacherClassDiscipline.endedAt IS NULL')
            }
          }))
          .groupBy( 'classroom.id')
          .getRawMany() as { id: number, name: string, school: string }[];

        return { status: 200, data: classrooms };
      }
    } catch (error: any) { return { status: 500, message: error.message } }
  }

  override async save(body: { id: number, classrooms: number[] }) {
    try {

      const classrooms = await AppDataSource.getRepository(Classroom)
        .createQueryBuilder('classroom')
        .select('classroom.id', 'id')
        .addSelect('classroom.shortName', 'name')
        .addSelect('school.shortName', 'school')
        .leftJoin('classroom.school', 'school')
        .where('classroom.id IN (:...ids)', { ids: body.classrooms })
        .getRawMany();

      return { status: 200, data: classrooms }
    } catch (error: any) { return { status: 500, message: error.message } }
  }
}

export const teacherClassroomsController = new TeacherClassroomsController();

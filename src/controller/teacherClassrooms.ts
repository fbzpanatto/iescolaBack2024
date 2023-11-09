import { GenericController } from "./genericController";
import {Brackets, EntityTarget, FindManyOptions, In, IsNull, ObjectLiteral} from "typeorm";
import { Classroom } from "../model/Classroom";
import { AppDataSource } from "../data-source";
import {Request} from "express";
import {TeacherClassDiscipline} from "../model/TeacherClassDiscipline";
import {TeacherBody} from "../interfaces/interfaces";
import {personCategories} from "../utils/personCategories";

class TeacherClassroomsController extends GenericController<EntityTarget<Classroom>> {

  constructor() {
    super(Classroom);
  }

  async findAllWhere(options: FindManyOptions<ObjectLiteral> | undefined, request?: Request) {

    const body = request?.body

    try {

      const teacher = await this.teacherByUser(body.user.user)
      const isAdminSupervisor = teacher.person.category.id === personCategories.ADMINISTRADOR || teacher.person.category.id === personCategories.SUPERVISOR

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


// TODO: um professor padrão não pode criar um professor. bem como não pode alterar suas salas de aulas nem suas disciplinas?

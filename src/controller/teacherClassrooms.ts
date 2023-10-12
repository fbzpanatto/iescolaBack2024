import { GenericController } from "./genericController";
import {EntityTarget, FindManyOptions, In, ObjectLiteral} from "typeorm";
import { Classroom } from "../model/Classroom";
import { AppDataSource } from "../data-source";
import {Request} from "express";
import {TeacherClassDiscipline} from "../model/TeacherClassDiscipline";

class TeacherClassroomsController extends GenericController<EntityTarget<Classroom>> {

  constructor() {
    super(Classroom);
  }

  async findAllWhere(options: FindManyOptions<ObjectLiteral> | undefined, request?: Request) {
    try {

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
        .leftJoin('teacher.person', 'person')
        .leftJoin('person.user', 'user')
        .where('user.id = :userId', { userId: request?.body.user.user })
        .groupBy( 'classroom.id')
        .getRawMany() as { id: number, name: string, school: string }[];

      return { status: 200, data: classrooms };
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

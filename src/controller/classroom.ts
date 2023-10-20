import { GenericController } from "./genericController";
import {Brackets, EntityTarget, FindManyOptions, ObjectLiteral} from "typeorm";
import { Classroom } from "../model/Classroom";
import {Request} from "express";
import {TeacherBody} from "../interfaces/interfaces";
import {personCategories} from "../utils/personCategories";

class ClassroomController extends GenericController<EntityTarget<Classroom>> {

  constructor() {
    super(Classroom);
  }

  override async findAllWhere(options: FindManyOptions<ObjectLiteral> | undefined, request?: Request) {

    const { body } = request as { body: TeacherBody }

    try {

      const teacher = await this.teacherByUser(body.user.user)
      const teacherClasses = await this.teacherClassrooms(request?.body.user)
      console.log(teacherClasses.classrooms)

      let result = await this.repository
        .createQueryBuilder('classroom')
        .select('classroom.id', 'id')
        .addSelect('classroom.shortName', 'name')
        .addSelect('school.shortName', 'school')
        .leftJoin('classroom.school', 'school')
        // .where('classroom.id IN (:...ids)', { ids: teacherClasses.classrooms })
        .where(new Brackets(qb => {
          if(teacher.person.category.id === personCategories.PROFESSOR) {
            qb.where('classroom.id IN (:...ids)', { ids: teacherClasses.classrooms })
          } else {
            qb.where('classroom.id > 0')
          }
        }))
        .getRawMany()

      return { status: 200, data: result }

    } catch (error: any) {
      console.log(error)
      return { status: 500, message: error.message }
    }
  }
}

export const classroomController = new ClassroomController();

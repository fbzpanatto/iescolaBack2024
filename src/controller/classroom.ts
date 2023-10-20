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

    const body = request?.body as TeacherBody

    try {

      const teacher = await this.teacherByUser(body.user.user)
      const teacherClasses = await this.teacherClassrooms(request?.body.user)

      let result = await this.repository
        .createQueryBuilder('classroom')
        .select('classroom.id', 'id')
        .addSelect('classroom.shortName', 'name')
        .addSelect('school.shortName', 'school')
        .leftJoin('classroom.school', 'school')
        .where(new Brackets(qb => {
          if(!(teacher.person.category.id === personCategories.PROFESSOR)) {
            qb.where('classroom.id > 0')
            return
          }
          qb.where('classroom.id IN (:...teacherClasses)', { teacherClasses: teacherClasses })
        }))
        .getRawMany();

      return { status: 200, data: result }

    } catch (error: any) {
      console.log(error)
      return { status: 500, message: error.message }
    }
  }
}

export const classroomController = new ClassroomController();

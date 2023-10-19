import { GenericController } from "./genericController";
import {EntityTarget, FindManyOptions, ObjectLiteral} from "typeorm";
import { Classroom } from "../model/Classroom";
import {Request} from "express";

class ClassroomController extends GenericController<EntityTarget<Classroom>> {

  constructor() {
    super(Classroom);
  }

  override async findAllWhere(options: FindManyOptions<ObjectLiteral> | undefined, request?: Request) {
    try {

      const teacherClasses = await this.teacherClassrooms(request?.body.user)

      let result = await this.repository
        .createQueryBuilder('classroom')
        .select('classroom.id', 'id')
        .addSelect('classroom.shortName', 'name')
        .addSelect('school.shortName', 'school')
        .leftJoin('classroom.school', 'school')
        .where('classroom.id IN (:...ids)', { ids: teacherClasses.classrooms })
        .getRawMany();

      return { status: 200, data: result }

    } catch (error: any) { return { status: 500, message: error.message } }
  }
}

export const classroomController = new ClassroomController();

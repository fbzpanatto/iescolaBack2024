import { GenericController } from "./genericController";
import { EntityTarget } from "typeorm";
import { Classroom } from "../model/Classroom";

class ClassroomController extends GenericController<EntityTarget<Classroom>> {

  constructor() {
    super(Classroom);
  }

  override async findAllWhere(options: any) {
    try {

      let result = await this.repository
        .createQueryBuilder('classroom')
        .select('classroom.id', 'id')
        .addSelect('classroom.shortName', 'name')
        .addSelect('school.shortName', 'school')
        .leftJoin('classroom.school', 'school')
        // .where('classroom.active = :active', { active: true })
        .getRawMany();

      return { status: 200, data: result }

    } catch (error: any) { return { status: 500, message: error.message } }
  }
}

export const classroomController = new ClassroomController();

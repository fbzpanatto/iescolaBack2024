import { GenericController } from "./genericController";
import {Brackets, EntityTarget, FindManyOptions, ObjectLiteral} from "typeorm";
import { Discipline } from "../model/Discipline";
import {Request} from "express";
import {TeacherBody} from "../interfaces/interfaces";
import {pc} from "../utils/personCategories";

class DisciplineController extends GenericController<EntityTarget<Discipline>> {

  constructor() {
    super(Discipline);
  }

  override async findAllWhere(options: FindManyOptions<ObjectLiteral> | undefined, request?: Request) {

    const body = request?.body as TeacherBody

    try {

      const teacher = await this.teacherByUser(body.user.user)
      const teacherDisciplines = await this.teacherDisciplines(request?.body.user)

      let result = await this.repository
        .createQueryBuilder('discipline')
        .select([
          'discipline.id as id',
          'discipline.name as name',
          'discipline.shortName as shortName',
        ])
        .where(new Brackets(qb => {
          if(!(teacher.person.category.id === pc.PROFESSOR)) {
            qb.where('discipline.id > 0')
            return
          }
          qb.where('discipline.id IN (:...ids)', { ids: teacherDisciplines.disciplines })
        }))
        .getRawMany();

      return { status: 200, data: result };
    } catch (error: any) { return { status: 500, message: error.message } }
  }
}

export const disciplineController = new DisciplineController();

import { GenericController } from "./genericController";
import {EntityTarget, FindManyOptions, ObjectLiteral} from "typeorm";
import { Discipline } from "../model/Discipline";
import {Request} from "express";

class DisciplineController extends GenericController<EntityTarget<Discipline>> {

  constructor() {
    super(Discipline);
  }

  override async findAllWhere(options: FindManyOptions<ObjectLiteral> | undefined, request?: Request) {
    try {

      const teacherDisciplines = await this.teacherDisciplines(request?.body.user)

      let result = await this.repository
        .createQueryBuilder('discipline')
        .select([
          'discipline.id as id',
          'discipline.name as name',
          'discipline.shortName as shortName',
        ])
        .where('discipline.id IN (:...ids)', { ids: teacherDisciplines.disciplines })
        .getRawMany();

      return { status: 200, data: result };
    } catch (error: any) { return { status: 500, message: error.message } }
  }
}

export const disciplineController = new DisciplineController();

import { GenericController } from "./genericController";
import { Brackets, EntityManager, EntityTarget } from "typeorm";
import { Discipline } from "../model/Discipline";
import { Request } from "express";
import { TeacherBody } from "../interfaces/interfaces";
import { pc } from "../utils/personCategories";
import { AppDataSource } from "../data-source";

class DisciplineController extends GenericController<EntityTarget<Discipline>> {

  constructor() { super(Discipline) }

  async getAllDisciplines(request: Request, CONN?: EntityManager) {

    const body = request?.body as TeacherBody;

    try {

      if(!CONN){
        const teacher = await this.teacherByUser(body.user.user);
        const teacherDisciplines = await this.teacherDisciplines(request?.body.user);
  
        let result = await this.repository
          .createQueryBuilder("discipline")
          .select([ "discipline.id as id", "discipline.name as name", "discipline.shortName as shortName" ])
          .where(
            new Brackets((qb) => {
              if (!(teacher.person.category.id === pc.PROF)) {
                qb.where("discipline.id > 0");
                return;
              }
              qb.where("discipline.id IN (:...ids)", { ids: teacherDisciplines.disciplines });
            }),
          )
          .getRawMany();
  
        return { status: 200, data: result };
      }

      let result

      await AppDataSource.transaction(async (CONN) => {

        const teacher = await this.teacherByUser(body.user.user, CONN);
        const teacherDisciplines = await this.teacherDisciplines(request?.body.user, CONN);

        result = await CONN.getRepository(Discipline)
          .createQueryBuilder("discipline") 
          .select([ "discipline.id as id", "discipline.name as name", "discipline.shortName as shortName" ])
          .where(
            new Brackets((qb) => {
              if (!(teacher.person.category.id === pc.PROF)) {
                qb.where("discipline.id > 0");
                return;
              }
              qb.where("discipline.id IN (:...ids)", { ids: teacherDisciplines.disciplines });
            }),
          )
        .getRawMany();
      })

      return { status: 200, data: result };

    } catch (error: any) { return { status: 500, message: error.message } }
  }
}

export const discController = new DisciplineController();

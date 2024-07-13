import { GenericController } from "./genericController";
import { Brackets, EntityManager, EntityTarget } from "typeorm";
import { Classroom } from "../model/Classroom";
import { Request } from "express";
import { TeacherBody } from "../interfaces/interfaces";
import { pc } from "../utils/personCategories";
import { AppDataSource } from "../data-source";

class ClassroomController extends GenericController<EntityTarget<Classroom>> {

  constructor() { super(Classroom) }

  async getAllClassrooms(request: Request, CONN?: EntityManager) {

    const { body } = request as { body: TeacherBody };
    let result: Classroom[] | null = null

    try {

      if(!CONN) {
        result = await AppDataSource.transaction(async (alternative) => {

          const uTeacher = await this.teacherByUser(body.user.user, alternative);
          const tClasses = await this.teacherClassrooms(request?.body.user, alternative);
          const masterUser = uTeacher.person.category.id === pc.ADMN || uTeacher.person.category.id === pc.SUPE;

          return await alternative.getRepository(Classroom)
            .createQueryBuilder("classroom")
            .select("classroom.id", "id")
            .addSelect("classroom.shortName", "name")
            .addSelect("school.shortName", "school")
            .leftJoin("classroom.school", "school")
            .where(
              new Brackets((qb) => {
                if (!masterUser) { qb.where("classroom.id IN (:...ids)", { ids: tClasses.classrooms }) }
                else { qb.where("classroom.id > 0") }
              }),
            )
            .getRawMany() as Classroom[]
        })
        return { status: 200, data: result };
      }

      result = await AppDataSource.transaction(async (CONN) => {

        const uTeacher = await this.teacherByUser(body.user.user, CONN);
        const tClasses = await this.teacherClassrooms(request?.body.user, CONN);
        const masterUser = uTeacher.person.category.id === pc.ADMN || uTeacher.person.category.id === pc.SUPE;

        return await CONN.getRepository(Classroom)
          .createQueryBuilder("classroom")
          .select("classroom.id", "id")
          .addSelect("classroom.shortName", "name")
          .addSelect("school.shortName", "school")
          .leftJoin("classroom.school", "school")
          .where(
            new Brackets((qb) => {
              if (!masterUser) { qb.where("classroom.id IN (:...ids)", { ids: tClasses.classrooms }) }
              else { qb.where("classroom.id > 0") }
            }),
          )
          .getRawMany() as Classroom[]
      })

      return { status: 200, data: result };

    } catch (error: any) { return { status: 500, message: error.message } }
  }
}

export const classroomController = new ClassroomController();

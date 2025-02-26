import { GenericController } from "./genericController";
import { Brackets, EntityManager, EntityTarget } from "typeorm";
import { Classroom } from "../model/Classroom";
import { Request } from "express";
import { TeacherBody } from "../interfaces/interfaces";
import { pc } from "../utils/personCategories";
import { AppDataSource } from "../data-source";
import {dbConn} from "../services/db";

class ClassroomController extends GenericController<EntityTarget<Classroom>> {

  constructor() { super(Classroom) }

  async getAllClassrooms( request: Request, teacherForm: boolean, CONN?: EntityManager ) {

    const { body } = request as { body: TeacherBody };

    let result: Classroom[] | null = null

    let sqlConnection = await dbConn()

    try {

      let masterUser: boolean

      if(!CONN) {
        result = await AppDataSource.transaction(async (alternative) => {

          const qUserTeacher = await this.qTeacherByUser(sqlConnection, body.user.user)
          const tClasses = await this.qTeacherClassrooms(sqlConnection, request?.body.user.user)

          const allClassrooms = [...tClasses.classrooms, 1216, 1217, 1218]

          const masterUser = qUserTeacher.person.category.id === pc.ADMN || qUserTeacher.person.category.id === pc.SUPE || qUserTeacher.person.category.id === pc.FORM;

          return await alternative.getRepository(Classroom)
            .createQueryBuilder("classroom")
            .select("classroom.id", "id")
            .addSelect("classroom.shortName", "name")
            .addSelect("school.shortName", "school")
            .leftJoin("classroom.school", "school")
            .where(
              new Brackets((qb) => {
                if (!masterUser) { qb.where("classroom.id IN (:...ids)", { ids: allClassrooms }) }
                else { qb.where("classroom.id > 0") }
              }),
            )
            .getRawMany() as Classroom[]
        })
        return { status: 200, data: result };
      }

      const qUserTeacher = await this.qTeacherByUser(sqlConnection, body.user.user)

      const tClasses = await this.qTeacherClassrooms(sqlConnection, request?.body.user.user)

      const allClassrooms = [...tClasses.classrooms, 1216, 1217, 1218]

      masterUser = qUserTeacher.person.category.id === pc.ADMN || qUserTeacher.person.category.id === pc.SUPE || qUserTeacher.person.category.id === pc.FORM;

      const data = await CONN.getRepository(Classroom)
        .createQueryBuilder("classroom")
        .select("classroom.id", "id")
        .addSelect("classroom.shortName", "name")
        .addSelect("school.shortName", "school")
        .leftJoin("classroom.school", "school")
        .where(
          new Brackets((qb) => {
            if (!masterUser) { qb.where("classroom.id IN (:...ids)", { ids: allClassrooms }) }
            else { qb.where("classroom.id > 0") }
          }),
        )
        .getRawMany() as Classroom[]

      return { status: 200, data }

    }
    catch (error: any) { return { status: 500, message: error.message } }
    finally { if(sqlConnection) { sqlConnection.release() } }
  }
}

export const classroomController = new ClassroomController();

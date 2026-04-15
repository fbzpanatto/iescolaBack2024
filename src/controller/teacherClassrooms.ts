import { GenericController } from "./genericController";
import { EntityTarget } from "typeorm";
import { Classroom } from "../model/Classroom";
import { Request } from "express";
import { PER_CAT } from "../utils/enums";
import { connectionPool } from "../services/db";

class TeacherClassroomsController extends GenericController<EntityTarget<Classroom>> {

  constructor() { super(Classroom) }

  async getAllTClass(request: Request) {

    const body = request?.body

    try {
      const qUserTeacher = await this.qTeacherByUser(body.user.user)

      const masterUser = qUserTeacher.person.category.id === PER_CAT.ADMN || qUserTeacher.person.category.id === PER_CAT.SUPE || qUserTeacher.person.category.id === PER_CAT.SUPE_EI || qUserTeacher.person.category.id === PER_CAT.FORM

      const classrooms = await this.qAllTClass(masterUser, qUserTeacher.id)

      return { status: 200, data: classrooms };
    }
    catch (error: any) { console.error(error); return { status: 500, message: error.message } }
  }

  override async save(body: { id: number, classrooms: number[], user?: any }) {

    if (!body.classrooms || body.classrooms.length === 0) { return { status: 403, message: "Somente pessoal autorizado da escola pode executar a transferencia"} }

    let conn;
    try {
      conn = await connectionPool.getConnection();

      const query = `
        SELECT 
          c.id AS id, 
          c.shortName AS name, 
          s.shortName AS school
        FROM classroom AS c
        LEFT JOIN school AS s ON c.schoolId = s.id
        WHERE c.id IN (?)
      `;

      const [ queryResult ] = await conn.query(query, [body.classrooms]);

      return { status: 200, data: queryResult };
    }
    catch (error: any) { console.error(error); return { status: 500, message: error.message } }
    finally { if (conn) { conn.release() } }
  }
}

export const teacherClassroomsController = new TeacherClassroomsController();

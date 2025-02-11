import { GenericController } from "./genericController";
import { EntityTarget } from "typeorm";
import { Test } from "../model/Test";
import { Request } from "express";
import { dbConn } from "../services/db";
import { pc } from "../utils/personCategories";

class ReportController extends GenericController<EntityTarget<Test>> {
  constructor() { super(Test) }

  async getHistory(req: Request) {

    const { student, year, limit, offset } = req.query;

    let sqlConnection = await dbConn()

    try {

      const el = await this.qTeacherByUser(sqlConnection, req.body.user.user)
      const teacherClasses = await this.qTeacherClassrooms(sqlConnection, req?.body.user.user)
      const masterTeacher = el.person.category.id === pc.ADMN || el.person.category.id === pc.SUPE || el.person.category.id === pc.FORM

      // const limit =  !isNaN(parseInt(req.query.limit as string)) ? parseInt(req.query.limit as string) : 100
      // const offset =  !isNaN(parseInt(req.query.offset as string)) ? parseInt(req.query.offset as string) : 0

      const result = await this.qCurrentTeacherStudents(sqlConnection, teacherClasses.classrooms, (student as string), masterTeacher)

      const studentIds = result.map((el) => el.studentId)

      if(!studentIds.length) { return { status: 200, data: [] } }

      const studentTests = await this.qStudentTestsByYear(sqlConnection, studentIds, (year as string))
      const studentAlpha = await this.qStudentAlphabeticsByYear(sqlConnection, studentIds, (year as string))

      return { status: 200, data: [...studentAlpha, ...studentTests] };
    } catch (error: any) {
      console.log(error);
      return { status: 500, message: error.message }
    } finally { if (sqlConnection) { sqlConnection.release() } }
  }

}

export const historyController = new ReportController();
import { GenericController } from "./genericController";
import { EntityTarget } from "typeorm";
import { Test } from "../model/Test";
import { Request } from "express";
import { pc } from "../utils/personCategories";

class ReportController extends GenericController<EntityTarget<Test>> {
  constructor() { super(Test) }

  async getHistory(req: Request) {

    const { student, year, limit, offset } = req.query;

    try {

      const qYear = await this.qYearByName(year as string)

      const el = await this.qTeacherByUser(req.body.user.user)
      const teacherClasses = await this.qTeacherClassrooms(req?.body.user.user)
      const masterTeacher = el.person.category.id === pc.ADMN || el.person.category.id === pc.SUPE || el.person.category.id === pc.FORM

      const limit =  !isNaN(parseInt(req.query.limit as string)) ? parseInt(req.query.limit as string) : 100
      const offset =  !isNaN(parseInt(req.query.offset as string)) ? parseInt(req.query.offset as string) : 0

      const result = await this.qCurrentTeacherStudents(qYear.id, teacherClasses.classrooms, (student as string), masterTeacher, limit, offset)

      const studentIds = result.map((el) => el.studentId)

      if(!studentIds.length) { return { status: 200, data: [] } }

      const studentTests = await this.qStudentTestsByYear(studentIds, qYear.id, limit, offset)

      const studentAlpha = await this.qStudentAlphabeticByYear(studentIds, qYear.id, limit, offset)

      return { status: 200, data: [...studentAlpha, ...studentTests] };
    } catch (error: any) { console.log(error); return { status: 500, message: error.message } }
  }

}

export const historyController = new ReportController();
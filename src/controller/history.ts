import { GenericController } from "./genericController";
import { EntityTarget } from "typeorm";
import { Test } from "../model/Test";
import { Request } from "express";
import { PERSON_CATEGORIES } from "../utils/enums";

class ReportController extends GenericController<EntityTarget<Test>> {
  constructor() { super(Test) }

  async getHistory(req: Request) {

    const { student, year } = req.query;

    if (!year || !student) { return { status: 400, message: "Parâmetros 'student' e 'year' são obrigatórios." } }

    try {

      const qYear = await this.qYearByName(year as string)

      const el = await this.qTeacherByUser(req.body.user.user)
      const teacherClasses = await this.qTeacherClassrooms(req?.body.user.user)
      const masterTeacher = el.person.category.id === PERSON_CATEGORIES.ADMN || el.person.category.id === PERSON_CATEGORIES.SUPE || el.person.category.id === PERSON_CATEGORIES.FORM

      const limit =  !isNaN(parseInt(req.query.limit as string)) ? parseInt(req.query.limit as string) : 100
      const offset =  !isNaN(parseInt(req.query.offset as string)) ? parseInt(req.query.offset as string) : 0

      const result = await this.qCurrentTeacherStudents(qYear.id, teacherClasses.classrooms, (student as string), masterTeacher, limit, offset)

      const studentIds = result.map((el) => el.studentId)

      if(!studentIds.length) { return { status: 200, data: [] } }

      const [studentTests, studentAlpha] = await Promise.all([
        this.qStudentTestsByYear(studentIds, qYear.id),
        this.qStudentAlphabeticByYear(studentIds, qYear.id)
      ]);

      return { status: 200, data: [...studentAlpha, ...studentTests] };
    } catch (error: any) { console.log(error); return { status: 500, message: error.message } }
  }
}

export const historyController = new ReportController();
import { dbConn } from "../services/db";
import { Student } from "../model/Student";
import { GenericController } from "./genericController";
import { TestByStudentId } from "../interfaces/interfaces";
import { TestQuestion } from "../model/TestQuestion";

class StudentTestController extends GenericController<any> {

  constructor() { super(Student) }

  async getTest(body: { user: { user: number, ra: string, category: number } }, params: { [key: string]: any }, query: { [key: string]: any }) {

    let sqlConnection = await dbConn()

    try {

      const currentYear = await this.qCurrentYear(sqlConnection)

      const testId = params.id;
      const studentId = body.user.user

      const year = !isNaN(parseInt(query.year as string)) ? parseInt(query.year as string) : currentYear.name

      const qTest = await this.qTestByIdAndYear(sqlConnection, testId, String(year))
      const qTestQuestions = await this.qTestQuestionsWithTitle(sqlConnection, testId) as TestQuestion[]

      const studentQuestions = await this.qStudentTestQuestions(sqlConnection, Number(testId), Number(studentId))

      const groupMap = new Map();

      qTestQuestions.forEach((tQ: any) => {
        const groupId = tQ.questionGroup.id;

        if (!groupMap.has(groupId)) {
          groupMap.set(groupId, {
            id: groupId,
            name: tQ.questionGroup.name,
            questions: []
          });
        }

        tQ.question.images = tQ.question.images > 0 ? (Array.from({ length: tQ.question.images }, (_, i) => i + 1)) : 0

        groupMap.get(groupId).questions.push(tQ);
      });

      const testQuestions = Array.from(groupMap.values());

      return { status: 200, data: { test: { ...qTest, testQuestions }, studentQuestions } }
    }

    catch (error: any) { return { status: 500, message: error.message } }

    finally { if(sqlConnection) { sqlConnection.release() } }
  }

  async allFilteredStudentTest(body: { user: { user: number, ra: string, category: number } }, params: { [key: string]: any }, query: { [key: string]: any }) {

    let sqlConnection = await dbConn()

    try {

      const { search, limit: l, offset: o } = query;

      const limit =  !isNaN(parseInt(l as string)) ? parseInt(l as string) : 100
      const offset =  !isNaN(parseInt(o as string)) ? parseInt(o as string) : 0

      const year = Number(params.year);
      const studentId = body.user.user

      const result = await this.qTestByStudentId<TestByStudentId>(sqlConnection, studentId, year, search, limit, offset)

      return { status: 200, data: result }

    }

    catch (error: any) { return { status: 500, message: error.message } }

    finally { if(sqlConnection) { sqlConnection.release() } }
  }

  async updateStudentAnswers(body: { user: { user: number, ra: string, category: number, iat: number, exp: number }, testId: number, studentId: number | string, questions: { studentQuestionId: number, answer: string, testQuestionId: number, studentId: number, rClassroomId: number | null }[] }) {

    let sqlConnection = await dbConn()

    try {

      await sqlConnection.beginTransaction()

      const result = await this.qFilteredTestByStudentId<TestByStudentId>(sqlConnection, Number(body.studentId), Number(body.testId))

      if(!result.active) {
        return { status: 400, message: "Tentativas esgotadas." }
      }

      for(let item of body.questions) {
        const query = `UPDATE student_question SET answer = ?, rClassroomId = ? WHERE id = ?`
        await sqlConnection.execute(query, [item.answer, result.classroomId, item.studentQuestionId]);
      }

      const query = `UPDATE student_test_status SET active = 0 WHERE id = ?`
      await sqlConnection.execute(query, [result.studentTestStatusId]);

      await sqlConnection.commit()

      return { status: 200, data: {} }
    }

    catch (error: any) { await sqlConnection.rollback(); return { status: 500, message: error.message } }
    finally { if(sqlConnection) { sqlConnection.release() }}
  }
}

export const studentTestController = new StudentTestController()
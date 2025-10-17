import { connectionPool } from "../services/db";
import { Student } from "../model/Student";
import { GenericController } from "./genericController";
import {TestByStudentId, UpdateStudentAnswers} from "../interfaces/interfaces";
import { TestQuestion } from "../model/TestQuestion";

class StudentTestController extends GenericController<any> {

  constructor() { super(Student) }

  async getTest(body: { user: { user: number, ra: string, category: number } }, params: { [key: string]: any }, query: { [key: string]: any }) {

    let conn;

    try {
      conn = await connectionPool.getConnection();
      await conn.beginTransaction();

      const scId = !isNaN(parseInt(query.ref)) ? parseInt(query.ref as string) : null;
      const testId = params.id;
      const studentId = body.user.user;

      if (!scId) {
        if (conn) await conn.rollback();
        return { status: 400, message: "Referência inválida." }
      }

      const stuTestInfo = await this.qFilteredTestByStudentId(Number(studentId), Number(testId));

      if (!stuTestInfo) { return { status: 404, message: "Teste não disponível para este aluno." } }

      const currentYear = await this.qCurrentYear();
      const year = !isNaN(parseInt(query.year as string)) ? parseInt(query.year as string) : currentYear.name;

      const qTest = await this.qTestByIdAndYear(testId, String(year));

      if (!qTest.active) { return { status: 400, message: 'Lançamentos temporariamente indisponíveis. Tente novamente mais tarde.' } }

      const qTestQuestions = await this.qTestQuestionsWithTitle(testId) as TestQuestion[];

      if (!qTestQuestions || qTestQuestions.length === 0) { return { status: 400, message: "Esta prova ainda não possui questões cadastradas." } }

      let studentQuestions = await this.qStudentTestQuestions(Number(testId), Number(studentId));

      if (!studentQuestions || studentQuestions.length === 0) {

        const insertStatusQuery = `
            INSERT INTO student_test_status
            (studentClassroomId, testId, active, observation, createdAt, createdByUser)
            VALUES (?, ?, 1, '', NOW(), ?)
            ON DUPLICATE KEY UPDATE
                                 updatedAt = NOW(),
                                 updatedByUser = VALUES(createdByUser)
        `;

        await conn.execute(insertStatusQuery, [stuTestInfo.studentClassroomId, testId, studentId]);

        const studentQuestionsToInsert = qTestQuestions.map(tq => [tq.id, studentId, '', new Date(), studentId]);

        const insertQuestionsQuery =
          `
            INSERT INTO student_question
            (testQuestionId, studentId, answer, createdAt, createdByUser)
            VALUES ?
            ON DUPLICATE KEY UPDATE updatedAt = NOW(), updatedByUser = VALUES(createdByUser)
          `;

        await conn.query(insertQuestionsQuery, [studentQuestionsToInsert]);

        await conn.commit();

        studentQuestions = await this.qStudentTestQuestions(Number(testId), Number(studentId));
      }
      else { await conn.commit() }

      const groupMap = new Map();
      qTestQuestions.forEach((tQ: any) => {
        const groupId = tQ.questionGroup.id;
        if (!groupMap.has(groupId)) { groupMap.set(groupId, { id: groupId, name: tQ.questionGroup.name, questions: [] }) }
        tQ.question.images = tQ.question.images > 0
          ? Array.from({ length: tQ.question.images }, (_, i) => i + 1)
          : 0;
        groupMap.get(groupId).questions.push(tQ);
      });

      const testQuestions = Array.from(groupMap.values());

      return { status: 200, data: { test: { ...qTest, testQuestions }, studentQuestions } };
    }
    catch (error: any) { console.log(error); if (conn) { await conn.rollback() } return { status: 500, message: error.message } }
    finally { if (conn) { conn.release() } }
  }

  async updateStudentAnswers(body: UpdateStudentAnswers) {

    let conn;

    try {
      conn = await connectionPool.getConnection();
      await conn.beginTransaction();

      const result = await this.qFilteredTestByStudentId<TestByStudentId>(Number(body.studentId), Number(body.testId));

      if (!result) { await conn.rollback(); return { status: 404, message: "Teste não encontrado para este aluno." } }

      if (!result.active && result.active !== null) {
        await conn.rollback();
        return { status: 400, message: "Tentativas esgotadas." }
      }

      let studentTestStatusId = result.studentTestStatusId;

      const updateStatusQuery = `UPDATE student_test_status SET active = 0, observation = '', updatedAt = NOW(), updatedByUser = ? WHERE id = ?`;
      await conn.execute(updateStatusQuery, [body.user.user, studentTestStatusId]);

      if (body.questions && body.questions.length > 0) {
        const caseAnswerClauses: string[] = [];
        const caseClassroomClauses: string[] = [];
        const questionIds: number[] = [];

        const answerParams: (string | number)[] = [];
        const classroomParams: (string | number | null)[] = [];

        for (const item of body.questions) {
          caseAnswerClauses.push('WHEN ? THEN ?');
          answerParams.push(item.studentQuestionId, item.answer);

          caseClassroomClauses.push('WHEN ? THEN ?');
          classroomParams.push(item.studentQuestionId, result.classroomId);

          questionIds.push(item.studentQuestionId);
        }

        const finalParams = [...answerParams, ...classroomParams, body.user.user, ...questionIds];

        const bulkUpdateQuery = `
          UPDATE student_question
          SET
            answer = CASE id ${caseAnswerClauses.join(' ')} END,
            rClassroomId = CASE id ${caseClassroomClauses.join(' ')} END,
            updatedAt = NOW(),
            updatedByUser = ?
          WHERE id IN (${questionIds.map(() => '?').join(',')})
        `;

        await conn.execute(bulkUpdateQuery, finalParams);
      }

      await conn.commit();
      return { status: 200, data: { studentTestStatusId, message: "Prova enviada com sucesso!" } };
    }
    catch (error: any) { if (conn) await conn.rollback(); return { status: 500, message: error.message } }
    finally { if (conn) { conn.release(); } }
  }

  async allFilteredStudentTest(body: { user: { user: number, ra: string, category: number } }, params: { [key: string]: any }, query: { [key: string]: any }) {
    try {

      const { search, limit: l, offset: o } = query;

      const limit =  !isNaN(parseInt(l as string)) ? parseInt(l as string) : 100
      const offset =  !isNaN(parseInt(o as string)) ? parseInt(o as string) : 0

      const year = Number(params.year);
      const studentId = body.user.user

      const result = await this.qTestByStudentId<TestByStudentId>(studentId, year, search, limit, offset)

      return { status: 200, data: result }
    }
    catch (error: any) { return { status: 500, message: error.message } }
  }
}

export const studentTestController = new StudentTestController()
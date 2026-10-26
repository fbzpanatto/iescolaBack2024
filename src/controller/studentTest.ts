import { connectionPool } from "../services/db";
import { Student } from "../model/Student";
import { GenericController } from "./genericController";
import { TestByStudentId, TestQuestionWithImages, UpdateStudentAnswers, JwtPayload } from "../interfaces/interfaces";
import { Helper } from "../utils/helpers";
import { resolveStudentId } from "../utils/studentToken";
import { yearRepository } from "../repositories/year.repository";
import { testRepository } from "../repositories/test.repository";
import { testQuestionRepository } from "../repositories/test-question.repository";
import { studentTestStatusRepository } from "../repositories/student-test-status.repository";
import { studentTestRepository } from "../repositories/student-test.repository";
import { testTokenRepository } from "../repositories/test-token.repository";

class StudentTestController extends GenericController<any> {

  constructor() { super(Student) }

  async getTest(body: any, params: { [key: string]: any }, query: { [key: string]: any }, authUser: JwtPayload) {

    const studentId = resolveStudentId(authUser);
    if (studentId === null) { return { status: 403, message: "Você não tem permissão para acessar este recurso." } }

    let conn;

    try {

      const token = query.token as string | undefined;

      const scId = !isNaN(parseInt(query.ref)) ? parseInt(query.ref as string) : null;
      if (!scId) { return { status: 400, message: "Referência inválida." } }

      const testId = params.id;

      // Ano letivo resolvido antes do gate — necessário para a faxina de vínculo abaixo.
      const currYear = await yearRepository.qCurrentYear();
      const year = !isNaN(parseInt(query.year as string)) ? parseInt(query.year as string) : currYear.name;

      // Migra vínculos órfãos presos a matrículas antigas (aluno transferido de sala).
      // Necessário aqui porque a prova pode ser acessada por link direto, sem passar pela listagem.
      await studentTestStatusRepository.updateAllStudentTestStatus(Number(studentId), String(year), Number(studentId));

      const stuTestInfo = await studentTestRepository.qFilteredTestByStudentId(Number(studentId), Number(testId));
      if (!stuTestInfo) { return { status: 404, message: "Teste não disponível para este aluno." } }

      const hasToken = Helper.hasToken(stuTestInfo.is_token_required);
      let qToken: { id: number, code: string } | null = null;

      if (hasToken) {
        if (!token || token.length !== 9) { return { status: 200, data: { requires_token: true } } }

        const validToken = await testTokenRepository.getTokenByCode(token, stuTestInfo.classroomId, stuTestInfo.testId)
        if (!validToken) { return { status: 403, message: 'Token inválido, expirado ou pertencente a uma sala diferente da sua matrícula atual.' } }

        qToken = { id: validToken.id, code: validToken.code }
      }

      const qTest = await testRepository.qTestByIdAndYear(testId, String(year));
      if (!qTest.active) { return { status: 400, message: 'Avaliação encerrada.' } }

      const qTqs = await testQuestionRepository.qTestQuestionsWithTitle(testId) as TestQuestionWithImages[];
      if (!qTqs || qTqs.length === 0) { return { status: 400, message: "Esta prova ainda não possui questões." } }

      let studentQuestions = await studentTestRepository.qStudentTestQuestions(Number(testId), Number(studentId));

      if (!studentQuestions || studentQuestions.length === 0) {
        conn = await connectionPool.getConnection();
        await conn.beginTransaction();

        try {
          const lockQuery = `
        SELECT id 
        FROM student_test_status 
        WHERE studentClassroomId = ? AND testId = ? 
        FOR UPDATE
      `;
          const [existingStatus] = await conn.query(lockQuery, [stuTestInfo.studentClassroomId, testId]) as any[];

          if (!existingStatus || existingStatus.length === 0) {
            const insertStatusQuery = `
          INSERT INTO student_test_status
          (studentClassroomId, testId, active, observation, createdAt, createdByUser)
          VALUES (?, ?, 1, '', ?, ?)
        `;
            await conn.execute(insertStatusQuery, [stuTestInfo.studentClassroomId, testId, Helper.generateDateTime().createdAt, studentId]);
          }

          const studentQuestionsToInsert = qTqs.map(tq => [tq.id, studentId, '', Helper.generateDateTime().createdAt, studentId]);

          const insertQuestionsQuery = `
        INSERT IGNORE INTO student_question
        (testQuestionId, studentId, answer, createdAt, createdByUser)
        VALUES ?
      `;
          await conn.query(insertQuestionsQuery, [studentQuestionsToInsert]);

          await conn.commit();

          studentQuestions = await studentTestRepository.qStudentTestQuestions(Number(testId), Number(studentId));
        }
        catch (error) { if (conn) await conn.rollback(); throw error }
        finally { if (conn) conn.release() }
      }

      const groupMap = new Map();

      qTqs.forEach((tQ) => {
        const grpId = tQ.questionGroup.id;
        if (!groupMap.has(grpId)) { groupMap.set(grpId, { id: grpId, name: tQ.questionGroup.name, questions: [] }) }
        groupMap.get(grpId).questions.push(tQ);
      });

      const testQuestions = Array.from(groupMap.values());

      return { status: 200, data: { test: { ...qTest, testQuestions }, studentQuestions, token: qToken, has_token: hasToken } };
    }
    catch (error: any) { console.error(error); return { status: 500, message: error.message } }
  }

  async updateStudentAnswers(body: UpdateStudentAnswers, authUser: JwtPayload) {

    const authStudentId = resolveStudentId(authUser);
    if (authStudentId === null) { return { status: 403, message: "Você não tem permissão para acessar este recurso." } }

    let conn;

    try {

      let message;

      conn = await connectionPool.getConnection();
      await conn.beginTransaction();

      const studentTest = await studentTestRepository.qFilteredTestByStudentId<TestByStudentId>(authStudentId, Number(body.testId));

      message = "Teste não encontrado para este aluno."
      if (!studentTest) { await conn.rollback(); return { status: 404, message } }

      message = "Token de acesso obrigatório para esta prova."
      if (Helper.hasToken(studentTest.is_token_required) && !(body.token && body.token.id)) { await conn.rollback(); return { status: 400, message } }

      message = "Você precisa acessar a prova antes de enviar respostas."
      if (!studentTest.studentTestStatusId) { await conn.rollback(); return { status: 400, message } }

      message = "Nenhuma resposta foi enviada."
      if (!body.questions || body.questions.length === 0) { await conn.rollback(); return { status: 400, message } }

      const lockQuery = `SELECT id, active FROM student_test_status WHERE id = ? FOR UPDATE`;
      const [lockResult] = await conn.query(lockQuery, [studentTest.studentTestStatusId]) as any[];

      message = "Esta prova já foi finalizada."
      if (!lockResult[0] || lockResult[0].active === 0 || lockResult[0].active === false) { await conn.rollback(); return { status: 400, message } }

      const updateStatusQuery = `
        UPDATE student_test_status
        SET active = 0, observation = '', updatedAt = ?, updatedByUser = ?
        WHERE id = ? AND active = 1
      `;
      const [updateResult] = await conn.execute(updateStatusQuery, [ Helper.generateDateTime().createdAt, authStudentId, studentTest.studentTestStatusId]) as any[];

      message = "Esta prova já foi finalizada por outra sessão."
      if (updateResult.affectedRows === 0) { await conn.rollback(); return { status: 400, message } }

      if (body.token && body.token.id) {

        const query =
          `
            UPDATE test_token
            SET leftUses = leftUses - 1
            WHERE id = ? AND testId = ? AND classroomId = ? AND leftUses > 0 AND expiresAt > ?
          `;

        const [tokenUpdate]: any = await conn.execute(query, [body.token.id, studentTest.testId, studentTest.classroomId, Helper.generateDateTime().createdAt]);

        if (tokenUpdate.affectedRows === 0) {

          const [exists]: any = await conn.query(
            "SELECT id FROM test_token WHERE id = ? AND testId = ? AND classroomId = ?",
            [body.token.id, studentTest.testId, studentTest.classroomId]
          );

          if (exists.length > 0) {
            await conn.rollback();
            return { status: 403, message: "Não foi possível finalizar: limite de usos ou tempo do token esgotado." };
          }

          await conn.rollback();
          return { status: 403, message: "Token de acesso inválido ou não encontrado." };
        }
      }

      const caseAnswerClauses: string[] = [];
      const caseClassroomClauses: string[] = [];
      const questionIds: number[] = [];

      const answerParams: (string | number)[] = [];
      const classroomParams: (string | number | null)[] = [];

      for (const item of body.questions) {
        caseAnswerClauses.push('WHEN ? THEN ?');
        answerParams.push(item.studentQuestionId, item.answer);

        caseClassroomClauses.push('WHEN ? THEN ?');
        classroomParams.push(item.studentQuestionId, studentTest.classroomId);

        questionIds.push(item.studentQuestionId);
      }

      const finalParams = [...answerParams, ...classroomParams, authStudentId, ...questionIds, authStudentId];

      const bulkUpdateQuery = `
        UPDATE student_question
        SET
          answer = CASE id ${caseAnswerClauses.join(' ')} END,
          rClassroomId = CASE id ${caseClassroomClauses.join(' ')} END,
          updatedAt = NOW(),
          updatedByUser = ?
        WHERE id IN (${questionIds.map(() => '?').join(',')}) AND studentId = ?
      `;

      await conn.execute(bulkUpdateQuery, finalParams);

      await conn.commit();
      return { status: 200, data: { studentTestStatusId: studentTest.studentTestStatusId, message: "Prova enviada com sucesso!" } };
    }
    catch (error: any) { if (conn) await conn.rollback(); return { status: 500, message: error.message } }
    finally { if (conn) { conn.release() } }
  }

  async allFilteredStudentTest(body: any, params: { [key: string]: any }, query: { [key: string]: any }, authUser: JwtPayload) {

    const studentId = resolveStudentId(authUser);
    if (studentId === null) { return { status: 403, message: "Você não tem permissão para acessar este recurso." } }

    try {

      const { search, limit: l, offset: o } = query;

      const limit =  !isNaN(parseInt(l as string)) ? parseInt(l as string) : 100
      const offset =  !isNaN(parseInt(o as string)) ? parseInt(o as string) : 0

      const year = Number(params.year);

      // Migra vínculos órfãos (aluno transferido de sala) para a matrícula ativa,
      // desde que não haja respostas gravadas. Mesma regra do fluxo do professor.
      await studentTestStatusRepository.updateAllStudentTestStatus(Number(studentId), String(year), Number(studentId));

      let result = await studentTestRepository.qTestByStudentId<TestByStudentId>(studentId, year, search, limit, offset)

      return { status: 200, data: result }
    }
    catch (error: any) { return { status: 500, message: error.message } }
  }
}

export const studentTestController = new StudentTestController()
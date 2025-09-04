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
      await sqlConnection.beginTransaction()

      const currentYear = await this.qCurrentYear(sqlConnection)

      const testId = params.id;
      const studentId = body.user.user

      const year = !isNaN(parseInt(query.year as string)) ? parseInt(query.year as string) : currentYear.name

      const qTest = await this.qTestByIdAndYear(sqlConnection, testId, String(year))
      const qTestQuestions = await this.qTestQuestionsWithTitle(sqlConnection, testId) as TestQuestion[]

      let studentQuestions = await this.qStudentTestQuestions(sqlConnection, Number(testId), Number(studentId))

      console.log('Student questions before creation:', studentQuestions)

      // Se não existem questões do aluno, precisa criar
      if (!studentQuestions || studentQuestions.length === 0) {

        // Busca informações do aluno e teste para obter o classroomId
        const studentTestInfo = await this.qFilteredTestByStudentId(
          sqlConnection,
          Number(studentId),
          Number(testId)
        )

        if (!studentTestInfo) {
          await sqlConnection.rollback()
          return { status: 404, message: "Teste não disponível para este aluno." }
        }

        // Cria um registro em student_test_status se não existir
        let studentTestStatusId = studentTestInfo.studentTestStatusId

        if (!studentTestStatusId) {
          const insertStatusQuery = `
            INSERT INTO student_test_status 
            (studentClassroomId, testId, active, observation, createdAt, createdByUser) 
            VALUES (?, ?, 1, 'Prova iniciada', NOW(), ?)
          `

          const [statusResult] = await sqlConnection.execute(insertStatusQuery, [
            studentTestInfo.studentClassroomId,
            testId,
            studentId // Usando o ID do estudante como createdByUser
          ])

          studentTestStatusId = (statusResult as any).insertId
        }

        // Prepara os registros para inserir em student_question
        const studentQuestionsToInsert = []

        for (const testQuestion of qTestQuestions) {
          studentQuestionsToInsert.push([
            testQuestion.id,
            studentId,
            '',
            new Date(),
            studentId
          ])
        }

        // Insere todas as questões de uma vez
        if (studentQuestionsToInsert.length > 0) {
          const insertQuestionsQuery = `
            INSERT INTO student_question 
            (testQuestionId, studentId, answer, createdAt, createdByUser) 
            VALUES ?
          `

          await sqlConnection.query(insertQuestionsQuery, [studentQuestionsToInsert])
        }

        // Busca novamente as questões criadas
        studentQuestions = await this.qStudentTestQuestions(sqlConnection, Number(testId), Number(studentId))

        console.log('Student questions after creation:', studentQuestions)
      }

      await sqlConnection.commit()

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

    catch (error: any) {
      console.log(error)
      await sqlConnection.rollback()
      return { status: 500, message: error.message }
    }

    finally {
      if(sqlConnection) {
        sqlConnection.release()
      }
    }
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

  async updateStudentAnswers(body: {
    user: { user: number, ra: string, category: number, iat: number, exp: number },
    testId: number,
    studentId: number | string,
    questions: {
      studentQuestionId: number,
      answer: string,
      testQuestionId: number,
      studentId: number,
      rClassroomId: number | null
    }[]
  }) {

    let sqlConnection = await dbConn()

    try {
      await sqlConnection.beginTransaction()

      // Busca informações do teste e aluno (agora pode retornar com studentTestStatusId null)
      const result = await this.qFilteredTestByStudentId<TestByStudentId>(
        sqlConnection,
        Number(body.studentId),
        Number(body.testId)
      )

      // Se não encontrou nenhum resultado, erro
      if (!result) {
        await sqlConnection.rollback()
        return { status: 404, message: "Teste não encontrado para este aluno." }
      }

      let studentTestStatusId = result.studentTestStatusId

      // Se não existe student_test_status ainda, precisa criar
      if (!studentTestStatusId) {
        const insertQuery = `
          INSERT INTO student_test_status 
          (studentClassroomId, testId, active, observation, createdAt, createdByUser) 
          VALUES (?, ?, 0, 'Prova finalizada', NOW(), ?)
        `

        const [insertResult] = await sqlConnection.execute(insertQuery, [
          result.studentClassroomId,
          body.testId,
          body.user.user // ID do usuário que está criando
        ])

        studentTestStatusId = (insertResult as any).insertId
      } else {
        // Se já existe, verifica se ainda está ativo
        if (!result.active && result.active !== null) {
          await sqlConnection.rollback()
          return { status: 400, message: "Tentativas esgotadas." }
        }

        // Atualiza para inativo (prova finalizada)
        const updateStatusQuery = `
          UPDATE student_test_status 
          SET active = 0, 
              observation = 'Prova finalizada', 
              updatedAt = NOW(), 
              updatedByUser = ?
          WHERE id = ?
        `
        await sqlConnection.execute(updateStatusQuery, [body.user.user, studentTestStatusId])
      }

      // Atualiza as respostas das questões
      for (let item of body.questions) {
        const query = `
          UPDATE student_question 
          SET answer = ?, 
              rClassroomId = ?,
              updatedAt = NOW(),
              updatedByUser = ?
          WHERE id = ?
        `
        await sqlConnection.execute(query, [
          item.answer,
          result.classroomId,
          body.user.user,
          item.studentQuestionId
        ])
      }

      await sqlConnection.commit()

      return {
        status: 200,
        data: {
          studentTestStatusId,
          message: "Prova enviada com sucesso!"
        }
      }
    }
    catch (error: any) {
      await sqlConnection.rollback()
      return { status: 500, message: error.message }
    }
    finally {
      if (sqlConnection) {
        sqlConnection.release()
      }
    }
  }
}

export const studentTestController = new StudentTestController()
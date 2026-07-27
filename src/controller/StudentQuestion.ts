import { GenericController } from "./genericController";
import { EntityTarget, ObjectLiteral } from "typeorm";
import { StudentQuestion } from "../model/StudentQuestion";
import { Request } from "express";
import { Test } from "../model/Test";
import { Student} from "../model/Student";
import { Classroom } from "../model/Classroom";
import { UserInterface, JwtPayload } from "../interfaces/interfaces";
import { StudentClassroom } from "../model/StudentClassroom";
import { connectionPool } from "../services/db";

class StudentQuestionController extends GenericController<EntityTarget<StudentQuestion>> {

  constructor() { super(StudentQuestion)}

  async updateReadingFluency(req: Request, authUser: JwtPayload) {

    const { body, query } = req;
    const { year } = query;
    let conn;

    try {
      conn = await connectionPool.getConnection();
      await conn.beginTransaction();

      const qUserTeacher = await this.qTeacherByUser(authUser.user);
      const userId = qUserTeacher.person.user.id;

      const cY = await this.qCurrentYear();
      if (!cY) { await conn.rollback(); return { status: 400, message: 'Ano não encontrado' } }
      if (parseInt(cY.name) !== parseInt(year as string)) { await conn.rollback(); return { status: 400, message: 'Não é permitido alterar o gabarito de anos anteriores.' }}

      const [testRows] = await conn.query(`SELECT active FROM test WHERE id = ?`, [body.test.id]) as Array<any>;

      if (testRows.length > 0 && !testRows[0].active) { await conn.rollback(); return { status: 403, message: 'Essa avaliação não permite novos lançamentos.' } }

      const [rfRows] = await conn.query(
        `SELECT id, readingFluencyLevelId, rClassroomId 
       FROM reading_fluency 
       WHERE testId = ? AND readingFluencyExamId = ? AND studentId = ?`,
        [body.test.id, body.readingFluencyExam.id, body.student.id]
      );

      const readingFluency = (rfRows as any[])[0];

      if (!readingFluency) {
        const insertQuery =
          `
            INSERT INTO reading_fluency 
            (testId, readingFluencyExamId, studentId, rClassroomId, readingFluencyLevelId, createdByUser, createdAt) 
            VALUES (?, ?, ?, ?, ?, ?, NOW())
          `;

        const levelId = body.readingFluencyLevel?.id || null;

        const [insertResult]: any = await conn.query(insertQuery, [body.test.id, body.readingFluencyExam.id, body.student.id, body.classroom.id, levelId, userId]);

        await conn.commit();

        return { status: 201, data: { id: insertResult.insertId, ...body } };
      }

      const scQuery = `
      SELECT 
        sc.endedAt,   
        p.name AS studentName, 
        c.shortName AS classroomName, 
        s.shortName AS schoolName
        FROM student_classroom sc
        INNER JOIN student st ON sc.studentId = st.id
        INNER JOIN person p ON st.personId = p.id
        INNER JOIN classroom c ON sc.classroomId = c.id
        INNER JOIN school s ON c.schoolId = s.id
        WHERE sc.id = ?
      `;

      const [scRows] = await conn.query(scQuery, [body.studentClassroom.id]);
      const sC = (scRows as any[])[0];

      if (sC?.endedAt && !readingFluency.readingFluencyLevelId) {
        await conn.rollback();
        return { status: 403, message: `${sC.studentName} consta como matrícula encerrada para ${sC.classroomName} - ${sC.schoolName}.` };
      }

      if (readingFluency.readingFluencyLevelId && readingFluency.rClassroomId && readingFluency.rClassroomId !== body.classroom.id) {
        const messageErr1 = 'Você não pode alterar um nível de alfabetização que já foi registrado em outra sala/escola.';
        await conn.rollback(); return { status: 403, message: messageErr1 }
      }

      const updateQuery = `
        UPDATE reading_fluency 
        SET readingFluencyLevelId = ?, rClassroomId = ?, updatedByUser = ?, updatedAt = NOW() 
        WHERE id = ?
      `;

      const newLevelId = body.readingFluencyLevel?.id || null;
      const newClassroomId = newLevelId ? body.classroom.id : null;

      await conn.query(updateQuery, [ newLevelId, newClassroomId, userId, readingFluency.id]);

      await conn.commit();

      return {
        status: 201,
        data: {
          ...body,
          id: readingFluency.id,
          readingFluencyLevel: newLevelId ? body.readingFluencyLevel : null,
          rClassroom: newClassroomId ? body.classroom : null
        }
      };
    }
    catch (error: any) { if (conn) { await conn.rollback() } console.log('error', error); return { status: 500, message: error.message } }
    finally { if (conn) { conn.release() } }
  }

  async updateAlphabetic(req: Request, authUser: JwtPayload){

    const { body, query } = req
    const { year } = query

    try {
      const cY = await this.qCurrentYear()
      if(!cY) { return { status: 400, message: 'Ano não encontrado' }}
      if(parseInt(cY.name) != parseInt(year as string)) { return { status: 400, message: 'Não é permitido alterar o gabarito de anos anteriores.' } }

      const qUserTeacher = await this.qTeacherByUser(authUser.user)
      const userId = qUserTeacher.person.user.id
      const now = new Date()
      const levelId = body.examLevel?.id ?? null

      const result = await this.qUpsertAlphabetic(
        body.testCategory.id, body.year, body.examBimester.id,
        body.student.id, body.studentClassroom.id, levelId, body.classroom.id, userId
      )

      if(result.outcome === 'test_not_found') { return { status: 404, message: 'Avaliação ainda não disponível.' } }
      if(result.outcome === 'test_inactive') { return { status: 403, message: `A avaliação do ${ result.bimesterName } não permite novos lançamentos.` } }
      if(result.outcome === 'classroom_ended') { return { status: 403, message: `${ result.studentName } consta como matrícula encerrada para ${result.classroomName} - ${result.schoolName}.` } }
      if(result.outcome === 'registered_elsewhere') { return { status: 403, message: 'Você não pode alterar um nível de alfabetização que já foi registrado em outra sala/escola.' } }

      if(result.outcome === 'created') {
        const data = { id: result.id, createdAt: now, createdByUser: userId, alphabeticLevel: body.examLevel ?? null, student: body.student, rClassroom: body.classroom, test: { id: result.testId } }
        return { status: 201, data }
      }

      const data = { id: result.id, observation: result.observation, rClassroom: body.classroom, alphabeticLevel: body.examLevel, updatedAt: now, updatedByUser: userId }
      return { status: 201, data }
    }
    catch (error: any) { return { status: 500, message: error.message } }
  }

  async updateQuestion(req: Request, body: ObjectLiteral, authUser: JwtPayload) {
    const { year } = req.query;

    try {
      const cY = await this.qCurrentYear();
      if (!cY) { return { status: 400, message: 'Ano não encontrado ou ano encerrado.' } }
      if (parseInt(cY.name) != parseInt(year as string)) { return { status: 400, message: 'Não é permitido alterar o gabarito de anos anteriores.' } }

      const updatedQuestion = await this.qUpdateAndValidateAnswer(Number(body.id), body.answer, body.classroom.id, body.studentClassroom.id, authUser.user);
      if (!updatedQuestion) { return { status: 403, message: 'A atualização não foi permitida devido a uma regra de negócio. (Ex: matrícula encerrada, teste inativo, etc)' } }

      const mappedRes = { ...updatedQuestion, score: updatedQuestion.correctAnswer.includes(updatedQuestion.answer.trim().toUpperCase()) ? 1 : 0 };
      delete mappedRes.correctAnswer;

      return { status: 200, data: mappedRes };
    }
    catch (error: any) { console.log(error); return { status: 500, message: error.message } }
  }

  async updateTestStatus(id: number | string, body: ObjectLiteral, authUser: JwtPayload) {
    try {
      const qUserTeacher = await this.qTeacherByUser(authUser.user)

      const register = await this.qUpdateTestStatus(Number(body.id), Number(id), Number(body.test.id), body.observation, body.active, qUserTeacher.person.user.id)
      if(!register) { return { status: 404, message: 'Registro não encontrado' } }

      const data = {}; return { status: 200, data }
    } catch (error: any) { return { status: 500, message: error.message } }
  }

  async alphaStatus(id: number | string, body: { id?: number, observation: string, student: Student, test: Test, rClassroom?: Classroom, testClassroom: Classroom, user?: UserInterface }, authUser: JwtPayload) {

    try {
      if(!body.test.id) { return { status: 404, message: 'Avalição ainda não disponível' } }

      const qUserTeacher = await this.qTeacherByUser(authUser.user)
      const userId = qUserTeacher.person.user.id
      const now = new Date()

      if(body.id) {
        delete body.rClassroom;
        await this.qUpdateAlphaStatus(body.id, body.observation, body.student.id, body.test.id, userId)
        const data = { ...body, updatedAt: now, updatedByUser: userId }
        return { status: 200, data }
      }

      const newId = await this.qInsertAlphaStatus(body.observation, body.student.id, body.test.id, body.rClassroom?.id ?? null, userId)
      const data = { ...body, id: newId, createdAt: now, createdByUser: userId }
      return { status: 200, data }
    }
    catch (error: any) { return { status: 500, message: error.message } }
  }
}

export const stuQuestCtrl = new StudentQuestionController();

import { GenericController } from "./genericController";
import { EntityTarget, ObjectLiteral } from "typeorm";
import { AppDataSource } from "../data-source";
import { StudentQuestion } from "../model/StudentQuestion";
import { StudentTestStatus } from "../model/StudentTestStatus";
import { Request } from "express";
import { ReadingFluency } from "../model/ReadingFluency";
import { Test } from "../model/Test";
import { Alphabetic } from "../model/Alphabetic";
import { AlphabeticFirst } from "../model/AlphabeticFirst";
import { Student} from "../model/Student";
import { Classroom } from "../model/Classroom";
import { UserInterface } from "../interfaces/interfaces";
import { StudentClassroom } from "../model/StudentClassroom";
import { connectionPool } from "../services/db";

class StudentQuestionController extends GenericController<EntityTarget<StudentQuestion>> {

  constructor() { super(StudentQuestion)}

  async updateReadingFluency_backUp(req: Request){

    const { body, query } = req
    const { year } = query

    try {
      return await AppDataSource.transaction(async(CONN) => {

        let data;

        const qUserTeacher = await this.qTeacherByUser(body.user.user)

        const cY = await this.qCurrentYear()
        if(!cY) { return { status: 400, message: 'Ano não encontrado' }}
        if(parseInt(cY.name) != parseInt(year as string)) { return { status: 400, message: 'Não é permitido alterar o gabarito de anos anteriores.' } }

        const test = await CONN.findOne(Test, { where: { id: body.test.id } })
        if(test && !test.active){ return { status: 403, message: 'Essa avaliação não permite novos lançamentos.' } }

        const options = { where: { test: { id: body.test.id }, readingFluencyExam: { id: body.readingFluencyExam.id }, student: { id: body.student.id } }, relations: ['rClassroom', 'readingFluencyLevel'] }
        const readingFluency: ReadingFluency | null = await CONN.findOne(ReadingFluency, options)

        if(!readingFluency) {
          data = await CONN.save(ReadingFluency, {...body, createdAt: new Date(), createdByUser: qUserTeacher.person.user.id, rClassroom: body.classroom }); return { status: 201, data }
        }

        const id = body.studentClassroom.id
        const relations = ['classroom.school', 'student.person']
        const sC: StudentClassroom | null = await CONN.findOne(StudentClassroom, { where: { id }, relations })

        if(sC?.endedAt && !readingFluency?.readingFluencyLevel) {
          return { status: 403, message: `${ sC.student.person.name } consta como matrícula encerrada para ${sC.classroom.shortName} - ${sC.classroom.school.shortName}.` }
        }

        const messageErr1: string = 'Você não pode alterar um nível de alfabetização que já foi registrado em outra sala/escola.'
        if(readingFluency?.readingFluencyLevel && readingFluency?.rClassroom && readingFluency?.rClassroom.id != body.classroom.id) { return { status: 403, message: messageErr1 } }

        readingFluency.readingFluencyLevel = body.readingFluencyLevel
        readingFluency.rClassroom = body.readingFluencyLevel?.id ? body.classroom : null

        data = await CONN.save(ReadingFluency, {...readingFluency, updatedAt: new Date(), updatedByUser: qUserTeacher.person.user.id })

        return { status: 201, data }
      })
    }
    catch (error: any) { console.log('error', error); return { status: 500, message: error.message } }
  }

  async updateReadingFluency(req: Request) {

    const { body, query } = req;
    const { year } = query;
    let conn;

    try {
      conn = await connectionPool.getConnection();
      await conn.beginTransaction();

      const qUserTeacher = await this.qTeacherByUser(body.user.user);
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

  async updateAlphabetic(req: Request){

    const { body, query } = req
    const { year } = query

    try {
      return await AppDataSource.transaction(async(CONN) => {

        let data;

        const qUserTeacher = await this.qTeacherByUser(body.user.user)

        const cY = await this.qCurrentYear()
        if(!cY) { return { status: 400, message: 'Ano não encontrado' }}
        if(parseInt(cY.name) != parseInt(year as string)) { return { status: 400, message: 'Não é permitido alterar o gabarito de anos anteriores.' } }

        const test = await CONN.findOne(Test, { where: { category: { id: body.testCategory.id }, period: { year: { name: body.year }, bimester: { id: body.examBimester.id } } }, relations: ["period.bimester"] })
        if(!test) { return { status: 404, message: 'Avaliação ainda não disponível.' } }

        const bimester = test?.period.bimester.name

        if(test && !test.active){ return { status: 403, message: `A avaliação do ${ bimester } não permite novos lançamentos.` } }

        const options = { where: { test: { id: test?.id }, student: { id: body.student.id } }, relations: ['rClassroom', 'alphabeticLevel'] }
        const alpha = await CONN.findOne(Alphabetic, options)

        if(!alpha) {
          data = await CONN.save(Alphabetic, { createdAt: new Date(), createdByUser: qUserTeacher.person.user.id, alphabeticLevel: body.examLevel, student: body.student, rClassroom: body.classroom, test }); return { status: 201, data }
        }

        const id = body.studentClassroom.id
        const relations = ['classroom.school', 'student.person']
        const sC: StudentClassroom | null = await CONN.findOne(StudentClassroom, { where: { id }, relations })

        if(sC?.endedAt && !alpha?.alphabeticLevel) {
          return { status: 403, message: `${ sC.student.person.name } consta como matrícula encerrada para ${sC.classroom.shortName} - ${sC.classroom.school.shortName}.` }
        }

        const messageErr1: string = 'Você não pode alterar um nível de alfabetização que já foi registrado em outra sala/escola.'
        if(alpha?.alphabeticLevel && alpha?.rClassroom && alpha?.rClassroom.id != body.classroom.id) { return { status: 403, message: messageErr1 } }

        alpha.rClassroom = body.classroom; alpha.alphabeticLevel = body.examLevel

        data = await CONN.save(Alphabetic, {...alpha, updatedAt: new Date(), updatedByUser: qUserTeacher.person.user.id })

        return { status: 201, data }
      })
    }
    catch (error: any) { return { status: 500, message: error.message } }
  }

  async updateAlphabeticFirstLevel(req: Request){

    const { body } = req

    try {
      return await AppDataSource.transaction(async(CONN) => {

        let data;

        const qUserTeacher = await this.qTeacherByUser(body.user.user)

        const student = body.student
        const alphabeticFirst = body.alphabeticFirst

        const first = await CONN.findOne(AlphabeticFirst, { where: { student } })

        if(!first){
          data = await CONN.save(AlphabeticFirst, { student, alphabeticFirst, createdAt: new Date(), createdByUser: qUserTeacher.person.user.id })
          return { status: 201, data }
        }

        first.alphabeticFirst = alphabeticFirst

        data = await CONN.save(AlphabeticFirst, { ...first, updatedAt: new Date(), updatedByUser: qUserTeacher.person.user.id })

        return { status: 201, data }
      })
    }
    catch (error: any) { return { status: 500, message: error.message } }
  }

  async updateQuestion(req: Request, body: ObjectLiteral) {
    const { year } = req.query;

    try {
      const cY = await this.qCurrentYear();
      if (!cY) { return { status: 400, message: 'Ano não encontrado ou ano encerrado.' } }
      if (parseInt(cY.name) != parseInt(year as string)) { return { status: 400, message: 'Não é permitido alterar o gabarito de anos anteriores.' } }

      const updatedQuestion = await this.qUpdateAndValidateAnswer(Number(body.id), body.answer, body.classroom.id, body.studentClassroom.id, body.user.user);
      if (!updatedQuestion) { return { status: 403, message: 'A atualização não foi permitida devido a uma regra de negócio. (Ex: matrícula encerrada, teste inativo, etc)' } }

      const mappedRes = { ...updatedQuestion, score: updatedQuestion.correctAnswer.includes(updatedQuestion.answer.trim().toUpperCase()) ? 1 : 0 };
      delete mappedRes.correctAnswer;

      return { status: 200, data: mappedRes };
    }
    catch (error: any) { console.log(error); return { status: 500, message: error.message } }
  }

  async updateTestStatus(id: number | string, body: ObjectLiteral) {
    try {

      const qUserTeacher = await this.qTeacherByUser(body.user.user)

      return await AppDataSource.transaction(async(CONN) => {
        const options = { relations: ['test', 'studentClassroom'], where: { id: Number(body.id), studentClassroom: { id: Number(id) }, test: { id: Number(body.test.id) }}}
        const register = await CONN.findOne(StudentTestStatus, { ...options })
        if(!register) { return { status: 404, message: 'Registro não encontrado' } }
        register.observation = body.observation ?? register.observation
        register.active = body.active ?? register.active
        register.updatedAt = new Date()
        register.updatedByUser = qUserTeacher.person.user.id
        await CONN.save(StudentTestStatus, register)
        const data = {}; return { status: 200, data }
      })
    } catch (error: any) { return { status: 500, message: error.message } }
  }

  async alphaStatus(id: number | string, body: { id?: number, observation: string, student: Student, test: Test, rClassroom?: Classroom, testClassroom: Classroom, user?: UserInterface }) {

    try {
      return await AppDataSource.transaction(async(CONN) => {

        if(!body.test.id) { return { status: 404, message: 'Avalição ainda não disponível' } }

        const qUserTeacher = await this.qTeacherByUser(body.user!.user)

        delete body.user

        let newBody;

        if(body.id) {
          delete body.rClassroom;
          newBody = { ...body, updatedAt: new Date(), updatedByUser: qUserTeacher.person.user.id }
        }

        else { newBody = { ...body, createdAt: new Date(), createdByUser: qUserTeacher.person.user.id } }

        let data = await CONN.save(Alphabetic, newBody)
        return { status: 200, data }
      })
    }
    catch (error: any) { return { status: 500, message: error.message } }
  }
}

export const stuQuestCtrl = new StudentQuestionController();

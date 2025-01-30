import { GenericController } from "./genericController";
import { EntityManager, EntityTarget, ObjectLiteral } from "typeorm";
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
import { dbConn } from "../services/db";

class StudentQuestionController extends GenericController<EntityTarget<StudentQuestion>> {

  constructor() { super(StudentQuestion)}

  async updateReadingFluency(req: Request){

    const { body, query } = req
    const { year } = query

    let sqlConnection = await dbConn()

    try {
      return await AppDataSource.transaction(async(CONN) => {

        let data;

        const qUserTeacher = await this.qTeacherByUser(sqlConnection, body.user.user)

        const cY = await this.qCurrentYear(sqlConnection)
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

        readingFluency.rClassroom = body.classroom; readingFluency.readingFluencyLevel = body.readingFluencyLevel

        data = await CONN.save(ReadingFluency, {...readingFluency, updatedAt: new Date(), updatedByUser: qUserTeacher.person.user.id })

        return { status: 201, data }
      })
    }
    catch (error: any) {
      console.log('error', error)
      return { status: 500, message: error.message }
    }
    finally { if(sqlConnection) { sqlConnection.release() } }
  }

  async updateAlphabetic(req: Request){

    const { body, query } = req
    const { year } = query

    let sqlConnection = await dbConn()

    try {
      return await AppDataSource.transaction(async(CONN) => {

        let data;

        const qUserTeacher = await this.qTeacherByUser(sqlConnection, body.user.user)

        const cY = await this.qCurrentYear(sqlConnection)
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
    finally { if(sqlConnection) { sqlConnection.release() } }
  }

  async updateAlphabeticFirstLevel(req: Request){

    const { body } = req

    let sqlConnection = await dbConn()

    try {
      return await AppDataSource.transaction(async(CONN) => {

        let data;

        const qUserTeacher = await this.qTeacherByUser(sqlConnection, body.user.user)

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
    finally { if(sqlConnection) { sqlConnection.release() } }
  }

  async updateQuestion(req: Request, body: ObjectLiteral) {

    const { year } = req.query

    let sqlConnection = await dbConn()

    try {
      return await AppDataSource.transaction(async(CONN: EntityManager)=> {

        const cY = await this.qCurrentYear(sqlConnection)
        if(!cY) { return { status: 400, message: 'Ano não encontrado ou ano encerrado.' }}
        if(parseInt(cY.name) != parseInt(year as string)) { return { status: 400, message: 'Não é permitido alterar o gabarito de anos anteriores.' } }

        const sQ: StudentQuestion | null = await CONN.findOne(StudentQuestion, { relations: ['testQuestion.test', 'rClassroom'], where: { id: Number(body.id) } })
        if(!sQ) { return { status: 400, message: 'Registro não encontrado' } }

        if(sQ.testQuestion.test && !sQ.testQuestion.test.active){ return { status: 403, message: `Este bimestre ou avaliação não permite novos lançamentos.` } }

        const id = body.studentClassroom.id
        const relations = ['classroom.school', 'student.studentQuestions.rClassroom', 'student.studentQuestions.testQuestion.test', 'student.person']
        const sC: StudentClassroom | null = await CONN.findOne(StudentClassroom, { where: { id }, relations })
        const condition = sC?.student.studentQuestions.filter(el => el.testQuestion.test.id === sQ.testQuestion.test.id).every(el => el.answer.length < 1 || el.answer === '' || el.answer === ' ')
        if(sC?.endedAt && condition) { return { status: 403, message: `${ sC.student.person.name } consta como matrícula encerrada para ${sC.classroom.shortName} - ${sC.classroom.school.shortName}.` } }

        const msgErr1: string = 'Você não pode alterar um gabarito que já foi registrado em outra sala/escola.'
        const condition2 = sC?.student.studentQuestions.filter(el => el.testQuestion.test.id === sQ.testQuestion.test.id).every(el => el.answer.length > 0 && el.answer != ' ')
        if(condition2 && sQ.rClassroom && sQ.rClassroom.id != body.classroom.id) { return { status: 403, message: msgErr1  } }

        if(!['A', 'B', 'C', 'D', 'E', ''].includes(body.answer)) {
          return { status: 403, message: 'Informe uma letra válida entre: [A, B, C, D, E]' }
        }

        const updatedBy = await this.qTeacherByUser(sqlConnection, body.user.user)

        sQ.rClassroom = body.classroom; sQ.answer = body.answer; sQ.updatedByUser = updatedBy.id; sQ.updatedAt = new Date()

        const res = await CONN.save(StudentQuestion, sQ)

        const mappedRes = { ...res, score: sQ.testQuestion.answer.includes(res.answer.trim().toUpperCase()) ? 1 : 0 }
        return { status: 200, data: mappedRes };
      })
    }
    catch (error: any) {
      console.log(error)
      return { status: 500, message: error.message }
    }
    finally { if (sqlConnection) { sqlConnection.release() } }
  }

  async updateTestStatus(id: number | string, body: ObjectLiteral) {
    try {
      return await AppDataSource.transaction(async(CONN) => {
        const options = { relations: ['test', 'studentClassroom'], where: { id: Number(body.id), studentClassroom: { id: Number(id) }, test: { id: Number(body.test.id) }}}
        const register = await CONN.findOne(StudentTestStatus, { ...options })
        if(!register) { return { status: 404, message: 'Registro não encontrado' } }
        register.observation = body.observation ?? register.observation
        register.active = body.active ?? register.active
        await CONN.save(StudentTestStatus, register)
        const data = {}; return { status: 200, data }
      })
    } catch (error: any) { return { status: 500, message: error.message } }
  }

  async alphaStatus(id: number | string, body: { id?: number, observation: string, student: Student, test: Test, rClassroom?: Classroom, testClassroom: Classroom, user?: UserInterface }) {

    let sqlConnection = await dbConn()

    try {
      return await AppDataSource.transaction(async(CONN) => {

        if(!body.test.id) { return { status: 404, message: 'Avalição ainda não disponível' } }

        const qUserTeacher = await this.qTeacherByUser(sqlConnection, body.user!.user)

        delete body.user

        let newBody;

        if(body.id) {
          delete body.rClassroom;
          newBody = {
            ...body,
            updatedAt: new Date(),
            updatedByUser: qUserTeacher.person.user.id
          }
        }

        else {
          newBody = {
            ...body,
            createdAt: new Date(),
            createdByUser: qUserTeacher.person.user.id
          }
        }

        let data = await CONN.save(Alphabetic, newBody)
        return { status: 200, data }
      })
    }
    catch (error: any) { return { status: 500, message: error.message } }
    finally { if(sqlConnection) { sqlConnection.release() } }
  }
}

export const stuQuestCtrl = new StudentQuestionController();

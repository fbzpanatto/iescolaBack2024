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

class StudentQuestionController extends GenericController<EntityTarget<StudentQuestion>> {

  constructor() { super(StudentQuestion)}

  async updateReadingFluency(req: Request){

    const { body, query } = req
    const { year } = query

    try {
      return await AppDataSource.transaction(async(CONN) => {

        let data;

        const uTeacher = await this.teacherByUser(body.user.user, CONN);

        const currentYear = await this.currentYear(CONN)
        if(!currentYear) { return { status: 400, message: 'Ano não encontrado' }}
        if(parseInt(currentYear.name) != parseInt(year as string)) { return { status: 400, message: 'Não é permitido alterar o gabarito de anos anteriores.' } }

        const test = await CONN.findOne(Test, { where: { id: body.test.id } })
        if(test && !test.active){ return { status: 403, message: 'Essa avaliação não permite novos lançamentos.' } }

        const options = { where: { test: { id: body.test.id }, readingFluencyExam: { id: body.readingFluencyExam.id }, studentClassroom: { id: body.studentClassroom.id } } }
        const register = await CONN.findOne(ReadingFluency, options)

        if(!register) {
          data = await CONN.save(ReadingFluency, {...body, createdAt: new Date(), createdByUser: uTeacher.person.user.id })
          return { status: 201, data }
        }

        register.readingFluencyLevel = body.readingFluencyLevel
        await CONN.save(ReadingFluency, {...register, updatedAt: new Date(), updatedByUser: uTeacher.person.user.id })

        return { status: 201, data }
      })
    } catch (error: any) { return { status: 500, message: error.message } }
  }

  async updateAlphabeticFirstLevel(req: Request){

    const { body } = req

    try {
      return await AppDataSource.transaction(async(CONN) => {

        let data;

        const uTeacher = await this.teacherByUser(body.user.user, CONN);

        const student = body.student
        const alphabeticFirst = body.alphabeticFirst

        const first = await CONN.findOne(AlphabeticFirst, { where: { student } })

        if(!first){
          data = await CONN.save(AlphabeticFirst, { student, alphabeticFirst, createdAt: new Date(), createdByUser: uTeacher.person.user.id })
          return { status: 201, data }
        }

        first.alphabeticFirst = alphabeticFirst

        data = await CONN.save(AlphabeticFirst, { ...first, updatedAt: new Date(), updatedByUser: uTeacher.person.user.id })

        return { status: 201, data }
      })
    } catch (error: any) { return { status: 500, message: error.message } }
  }

  async updateAlphabetic(req: Request){

    const { body, query } = req
    const { year } = query

    try {
      return await AppDataSource.transaction(async(CONN) => {

        const uTeacher = await this.teacherByUser(body.user.user, CONN);

        let data;

        const currentYear = await this.currentYear(CONN)
        if(!currentYear) { return { status: 400, message: 'Ano não encontrado' }}
        if(parseInt(currentYear.name) != parseInt(year as string)) { return { status: 400, message: 'Não é permitido alterar o gabarito de anos anteriores.' } }

        const test = await CONN.findOne(Test, {
          where: {
            category: { id: body.testCategory.id },
            period: {
              year: { name: body.year },
              bimester: { id: body.examBimester.id },
            }
          },
          relations: ["period.bimester"]
        })

        if(!test) { return { status: 404, message: 'Avaliação ainda não disponível.' } }

        const bimester = test?.period.bimester.name

        if(test && !test.active){ return { status: 403, message: `A avaliação do ${bimester} não permite novos lançamentos.` } }

        const options = { where: { test: { id: test?.id }, student: { id: body.student.id } }, relations: ['rClassroom'] }
        const register = await CONN.findOne(Alphabetic, options)

        if(!register) {
          data = await CONN.save(Alphabetic, {
            createdAt: new Date(),
            createdByUser: uTeacher.person.user.id,
            alphabeticLevel: body.examLevel,
            student: body.student,
            rClassroom: body.classroom,
            test
          })
          return { status: 201, data }
        }

        if(register.rClassroom && register.rClassroom.id != body.classroom.id) {
          return { status: 403, message: 'Você não pode alterar um nível de alfabetização que já foi registrado em outra sala/escola.' }
        }

        register.rClassroom = body.classroom
        register.alphabeticLevel = body.examLevel

        data = await CONN.save(Alphabetic, {...register, updatedAt: new Date(), updatedByUser: uTeacher.person.user.id })

        return { status: 201, data }
      })
    } catch (error: any) { return { status: 500, message: error.message } }
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

  async updateQuestion(req: Request, body: ObjectLiteral) {

    const { year } = req.query

    try {
      return await AppDataSource.transaction(async(CONN)=> {

        const currentYear = await this.currentYear(CONN)
        if(!currentYear) { return { status: 400, message: 'Ano não encontrado' }}
        if(parseInt(currentYear.name) != parseInt(year as string)) { return { status: 400, message: 'Não é permitido alterar o gabarito de anos anteriores.' } }

        const studentQuestion = await CONN.findOne(StudentQuestion, { relations: ['testQuestion.test', 'rClassroom'], where: { id: Number(body.id) } })
        if(!studentQuestion) { return { status: 400, message: 'Registro não encontrado' } }

        if(studentQuestion.testQuestion.test && !studentQuestion.testQuestion.test.active){ return { status: 403, message: `Este bimestre ou avaliação não permite novos lançamentos.` } }

        if(studentQuestion.rClassroom && studentQuestion.rClassroom.id != body.classroom.id) {
          return { status: 403, message: 'Você não pode alterar um gabarito que já foi registrado em outra sala/escola.' }
        }

        studentQuestion.rClassroom = body.classroom
        studentQuestion.answer = body.answer

        const result = await CONN.save(StudentQuestion, studentQuestion)
        const mappedResult = { ...result, score: studentQuestion.testQuestion.answer.includes(result.answer.trim().toUpperCase()) ? 1 : 0 }
        return { status: 200, data: mappedResult };
      })
    } catch (error: any) { return { status: 500, message: error.message } }
  }
}

export const stuQuestCtrl = new StudentQuestionController();

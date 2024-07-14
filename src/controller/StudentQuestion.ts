import { GenericController } from "./genericController";
import { EntityTarget, ObjectLiteral } from "typeorm";
import { AppDataSource } from "../data-source";
import { StudentQuestion } from "../model/StudentQuestion";
import { StudentTestStatus } from "../model/StudentTestStatus";

class StudentQuestionController extends GenericController<EntityTarget<StudentQuestion>> {

  constructor() { super(StudentQuestion)}

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

  async updateQuestion(id: number | string, body: ObjectLiteral) {
    try {
      return await AppDataSource.transaction(async(CONN)=>{
        const studentQuestion = await CONN.findOne(StudentQuestion, { relations: ['testQuestion'], where: { id: Number(body.id) } })
        if(!studentQuestion) { return { status: 404, message: 'Registro não encontrado' } }
        const entity = { id: body.id, answer: body.answer, studentClassroom: { id: body.studentClassroom.id }, testQuestion: { id: body.testQuestion.id }}
        const result = await CONN.save(StudentQuestion, entity)
        const mappedResult = { ...result, score: studentQuestion.testQuestion.answer.includes(result.answer.trim().toUpperCase()) ? 1 : 0 }
        return { status: 200, data: mappedResult };
      })
    } catch (error: any) { return { status: 500, message: error.message } }
  }
}

export const stuQuestCtrl = new StudentQuestionController();

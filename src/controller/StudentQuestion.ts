import { GenericController } from "./genericController";
import {DeepPartial, EntityTarget, ObjectLiteral, SaveOptions} from "typeorm";
import { Bimester } from "../model/Bimester";
import {AppDataSource} from "../data-source";
import {StudentQuestion} from "../model/StudentQuestion";
import {StudentTestStatus} from "../model/StudentTestStatus";

class StudentQuestionController extends GenericController<EntityTarget<StudentQuestion>> {

  constructor() {
    super(StudentQuestion);
  }

  async updateTestStatus(id: number | string, body: ObjectLiteral) {

    try {

      const studentTestStatus = await AppDataSource.getRepository(StudentTestStatus)
        .findOne({
          relations: ['test', 'studentClassroom'],
          where: {
            id: Number(body.id),
            studentClassroom: { id: Number(id) },
            test: { id: Number(body.test.id) }
          } }) as StudentTestStatus

      if(!studentTestStatus) { return { status: 404, message: 'Registro não encontrado' } }

      studentTestStatus.observation = body.observation ?? studentTestStatus.observation
      studentTestStatus.active = body.active ?? studentTestStatus.active
      await AppDataSource.getRepository(StudentTestStatus).save(studentTestStatus)

      const result = {}
      return { status: 200, data: result };

    } catch (error: any) { return { status: 500, message: error.message } }

  }

  async updateQuestion(id: number | string, body: ObjectLiteral) {

    try {

      const studentQuestion = await AppDataSource.getRepository(StudentQuestion)
        .findOne({ relations: ['testQuestion'], where: { id: Number(body.id) } }) as StudentQuestion

      if(!studentQuestion) { return { status: 404, message: 'Registro não encontrado' } }

      const result = await AppDataSource
        .getRepository(StudentQuestion)
        .save({
          id: body.id,
          answer: body.answer,
          studentClassroom: { id: body.studentClassroom.id },
          testQuestion: { id: body.testQuestion.id }
        })

      const mappedResult = {
        ...result,
        score: studentQuestion.testQuestion.answer.includes(result.answer.trim().toUpperCase()) ? 1 : 0
      }

      return { status: 200, data: mappedResult };
    } catch (error: any) { return { status: 500, message: error.message } }
  }
}

export const studentQuestionController = new StudentQuestionController();

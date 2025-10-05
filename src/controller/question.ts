import { qGroupCtrl } from "./questionGroup";
import { classCatController } from "./classroomCategory";
import { GenericController } from "./genericController";
import { EntityTarget } from "typeorm";
import { Question } from "../model/Question";
import { Request } from "express";
import { AppDataSource } from "../data-source";
import { pc } from "../utils/personCategories";

class QuestionController extends GenericController<EntityTarget<Question>> {
  constructor() { super(Question) }

  async isOwner(req: Request) {
    const { id: questionId } = req.params

    try {
      return await AppDataSource.transaction(async(CONN)=> {

        const qUserTeacher = await this.qTeacherByUser(req.body.user.user)

        const masterUser = qUserTeacher.person.category.id === pc.ADMN || qUserTeacher.person.category.id === pc.SUPE || qUserTeacher.person.category.id === pc.FORM;
        const question = await CONN.findOne(Question,{ relations: ["person"], where: { id: parseInt(questionId as string) } })

        return { status: 200, data: { isOwner: qUserTeacher.person.id === question?.person.id || masterUser } };
      })
    }
    catch (error: any) { return { status: 500, message: error.message } }
  }

  async questionForm(req: Request) {
    try {
      return await AppDataSource.transaction(async(CONN)=>{
        const classroomCategories = (await classCatController.findAllWhere({}, req, CONN)).data;
        const groups = (await qGroupCtrl.findAllWhere({}, req, CONN)).data;
        return { status: 200, data: { classroomCategories, groups } };
      })
    } catch (error: any) { return { status: 500, message: error.message } }
  }

  async allQuestions(req: Request) {
    try {
      return await AppDataSource.transaction(async(CONN) => {
        const questions = await CONN.getRepository(Question)
          .createQueryBuilder("question")
          .leftJoinAndSelect("question.person", "person")
          .leftJoinAndSelect("question.skill", "skill")
          .leftJoinAndSelect("question.discipline", "discipline")
          .leftJoinAndSelect("question.classroomCategory", "classroomCategory")
          .where("discipline.id = :disciplineId", { disciplineId: req.query.discipline })
          .getMany();
        return { status: 200, data: questions };
      })
    } catch (error: any) { return { status: 500, message: error.message } }
  }
}

export const quesCtrl = new QuestionController();

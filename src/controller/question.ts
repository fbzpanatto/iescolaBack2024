import { questionGroupController } from "./questionGroup";
import { classCatController } from "./classroomCategory";
import { GenericController } from "./genericController";
import { EntityTarget, FindManyOptions, ObjectLiteral } from "typeorm";
import { Question } from "../model/Question";
import { Request } from "express";
import { AppDataSource } from "../data-source";
import { pc } from "../utils/personCategories";

class QuestionController extends GenericController<EntityTarget<Question>> {
  constructor() { super(Question) }

  async isOwner(req: Request) {
    const { id: questionId } = req.params
    try {
      const teacher = await this.teacherByUser(req.body.user.user)

      const isAdminSupervisor = teacher.person.category.id === pc.ADMN || teacher.person.category.id === pc.SUPE

      const question = await AppDataSource.getRepository(Question).findOne({ relations: ["person"], where: { id: parseInt(questionId as string) } })
      return { status: 200, data: { isOwner: teacher.person.id === question?.person.id || isAdminSupervisor } };
    } catch (error: any) { return { status: 500, message: error.message } }
  }

  async questionForm(req: Request) {
    try {
      const classroomCategories = (await classCatController.findAllWhere({}, req)).data;
      const groups = (await questionGroupController.findAllWhere({}, req)).data;

      return { status: 200, data: { classroomCategories, groups } };
    } catch (error: any) { return { status: 500, message: error.message } }
  }

  override async findAllWhere(options: FindManyOptions<ObjectLiteral> | undefined, request?: Request ) {

    const id = request?.query.discipline as string;

    try {

      const questions = await AppDataSource.getRepository(Question)
        .createQueryBuilder("question")
        .leftJoinAndSelect("question.person", "person")
        .leftJoinAndSelect("question.descriptor", "descriptor")
        .leftJoinAndSelect("descriptor.topic", "topic")
        .leftJoinAndSelect("topic.discipline", "discipline")
        .leftJoinAndSelect("topic.classroomCategory", "classroomCategory")
        .where("discipline.id = :disciplineId", { disciplineId: id })
        .getMany();

      return { status: 200, data: questions };
    } catch (error: any) { return { status: 500, message: error.message } }
  }
}

export const questionController = new QuestionController();

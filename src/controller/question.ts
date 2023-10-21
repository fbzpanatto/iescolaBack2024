import { GenericController } from "./genericController";
import { EntityTarget, FindManyOptions, ObjectLiteral } from "typeorm";
import { Question } from "../model/Question";
import { Request } from "express";
import { AppDataSource} from "../data-source";

class QuestionController extends GenericController<EntityTarget<Question>> {

  constructor() {
    super(Question);
  }

  override async findAllWhere(options: FindManyOptions<ObjectLiteral> | undefined, request?: Request) {

    const id = request?.query.discipline as string;

    try {

      const questions = await AppDataSource.getRepository(Question)
        .createQueryBuilder('question')
        .leftJoinAndSelect('question.descriptor', 'descriptor')
        .leftJoinAndSelect('descriptor.topic', 'topic')
        .leftJoinAndSelect('topic.discipline', 'discipline')
        .leftJoinAndSelect('topic.classroomCategory', 'classroomCategory')
        .where('discipline.id = :disciplineId', { disciplineId: id })
        .getMany();

      return { status: 200, data: questions };
    } catch (error: any) { return { status: 500, message: error.message } }
  }
}

export const questionController = new QuestionController();

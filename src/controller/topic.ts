import { GenericController } from "./genericController";
import { EntityTarget, FindManyOptions, ObjectLiteral } from "typeorm";
import { Topic } from "../model/Topic";
import { Request } from "express";
import { AppDataSource } from "../data-source";

class TopicController extends GenericController<EntityTarget<Topic>> {

  constructor() { super(Topic) }

  override async findAllWhere(options: FindManyOptions<ObjectLiteral> | undefined, request?: Request) {
    const classCategoryId = request?.query.category as string | undefined;
    const disciplineId = request?.query.discipline as string | undefined;
    try {
      return await AppDataSource.transaction(async(CONN) => {
        const options = { relations: ['classroomCategory'], where: { classroomCategory: { id: Number(classCategoryId) }, discipline: { id: Number(disciplineId)}}}
        const result = await CONN.find(Topic, { ...options })
        return { status: 200, data: result };
      })
    } catch (error: any) { return { status: 500, message: error.message } }
  }
}

export const topicController = new TopicController();

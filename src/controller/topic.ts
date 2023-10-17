import { GenericController } from "./genericController";
import { EntityTarget, FindManyOptions, ObjectLiteral } from "typeorm";
import { Topic } from "../model/Topic";
import { Request } from "express";
import { AppDataSource } from "../data-source";

class TopicController extends GenericController<EntityTarget<Topic>> {

  constructor() { super(Topic) }

  override async findAllWhere(options: FindManyOptions<ObjectLiteral> | undefined, request?: Request) {

    const classCategoryId = request?.query.category as string | undefined;

    try {

      const result = await AppDataSource.getRepository(Topic).find({
        relations: ['descriptors'],
        where: { classroomCategory: { id: Number(classCategoryId) } }
      });
      return { status: 200, data: result };
    } catch (error: any) { return { status: 500, message: error.message } }
  }
}

export const topicController = new TopicController();

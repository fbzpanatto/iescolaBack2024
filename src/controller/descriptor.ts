import { GenericController } from "./genericController";
import { EntityTarget, FindManyOptions, ObjectLiteral } from "typeorm";
import { Descriptor } from "../model/Descriptor";
import { Request } from "express";
import { AppDataSource } from "../data-source";

class DescriptorController extends GenericController<EntityTarget<Descriptor>> {
  constructor() { super(Descriptor) }

  override async findAllWhere( options: FindManyOptions<ObjectLiteral> | undefined, request?: Request ) {
    try {
      return await AppDataSource.transaction(async(CONN) => {
        const options = { where: { topic: { id: Number(request?.query.topic) } }}
        const result = await CONN.find(Descriptor, {...options}); return { status: 200, data: result }
      })
    } catch (error: any) { return { status: 500, message: error.message } }
  }
}

export const descriptorController = new DescriptorController();

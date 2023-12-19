import { GenericController } from "./genericController";
import { EntityTarget, FindManyOptions, ObjectLiteral } from "typeorm";
import { School } from "../model/School";
import { Request } from "express";
import { AppDataSource } from "../data-source";

class ReportLiteracy extends GenericController<EntityTarget<School>> {

  constructor() {
    super(School);
  }

  override async findAllWhere(options: FindManyOptions<ObjectLiteral> | undefined, request?: Request) {
    try {

      const result = await AppDataSource.getRepository(School)
        .createQueryBuilder('school')
        .getMany()

      console.log(result)

      return { status: 200, data: result };

    } catch (error: any) { return { status: 500, message: error.message } }
  }
}

export const reportLiteracyController = new ReportLiteracy();

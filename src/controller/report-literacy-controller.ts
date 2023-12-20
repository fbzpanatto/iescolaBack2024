import { GenericController } from "./genericController";
import { EntityTarget, FindManyOptions, ObjectLiteral } from "typeorm";
import { School } from "../model/School";
import { Request } from "express";
import { AppDataSource } from "../data-source";

class ReportLiteracy extends GenericController<EntityTarget<School>> {

  constructor() {
    super(School);
  }

  async getReport(request: Request) {

    const { classroom, year} = request.params
    const { search } = request.query

    try {

      console.log(classroom, year, search)

      const result = { }

      return { status: 200, data: result };

    } catch (error: any) { return { status: 500, message: error.message } }
  }
}

export const reportLiteracyController = new ReportLiteracy();

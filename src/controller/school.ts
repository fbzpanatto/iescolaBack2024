import { GenericController } from "./genericController";
import { EntityTarget } from "typeorm";
import { School } from "../model/School";
import { Request } from "express";

class SchoolController extends GenericController<EntityTarget<School>> {
  constructor() { super(School) }

  async getAllSchools(req: Request) {

    const { year } = req.params
    const { search } = req.query

    try {
      const sortedResult = await this.qGetAllSchools(year, (search as string | undefined) ?? '')

      return { status: 200, data: sortedResult };
    } catch (error: any) { return { status: 500, message: error.message } }
  }
}

export const schoolController = new SchoolController();

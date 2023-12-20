import { GenericController } from "./genericController";
import { EntityTarget } from "typeorm";
import { School } from "../model/School";
import { Request } from "express";
import { AppDataSource } from "../data-source";
import { LiteracyLevel } from "../model/LiteracyLevel";
import { LiteracyTier } from "../model/LiteracyTier";

class ReportLiteracy extends GenericController<EntityTarget<School>> {

  constructor() {
    super(School);
  }

  async getReport(request: Request) {

    const { classroom, year} = request.params
    const { search } = request.query

    try {

      const literacyLevels = await AppDataSource.getRepository(LiteracyLevel).find()
      const literacyTiers = await AppDataSource.getRepository(LiteracyTier).find()

      return { status: 200, data: { literacyTiers, literacyLevels } };

    } catch (error: any) { return { status: 500, message: error.message } }
  }
}

export const reportLiteracyController = new ReportLiteracy();

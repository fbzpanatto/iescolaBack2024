import { GenericController } from "./genericController";
import { EntityTarget } from "typeorm";
import { Literacy } from "../model/Literacy";
import { Request } from "express";

class LiteracySecondController extends GenericController<EntityTarget<Literacy>> {

  constructor() { super(Literacy) }

  async getClassrooms(req: Request) {

    const search = req.query.search as string
    const yearName = req.params.year as string
    const userBody = req.body.user

    try {

      const teacherClasses = await this.teacherClassrooms(req.body.user)

      const preResult: never[] = []

      return { status: 200, data: preResult }
    } catch (error: any) { return { status: 500, message: error.message } }
  }

}

export const literacySecondController = new LiteracySecondController();

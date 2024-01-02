import { GenericController } from "./genericController";
import { EntityTarget } from "typeorm";
import { Literacy } from "../model/Literacy";
import { Request } from "express";

class LiteracySecondController extends GenericController<EntityTarget<Literacy>> {

  constructor() { super(Literacy) }

  async getClassrooms(req: Request) {
    try {

      console.log('req.params', req.params)

      const preResult = {}

      return { status: 200, data: preResult }
    } catch (error: any) { return { status: 500, message: error.message } }
  }

}

export const literacySecondController = new LiteracySecondController();

import { GenericController } from "./genericController";
import { EntityTarget } from "typeorm";
import { School } from "../model/School";

class SchoolController extends GenericController<EntityTarget<School>> {

  constructor() {
    super(School);
  }
}

export const schoolController = new SchoolController();

import { GenericController } from "./genericController";
import { EntityTarget } from "typeorm";
import { Discipline } from "../model/Discipline";

class DisciplineController extends GenericController<EntityTarget<Discipline>> {

  constructor() {
    super(Discipline);
  }
}

export const disciplineController = new DisciplineController();

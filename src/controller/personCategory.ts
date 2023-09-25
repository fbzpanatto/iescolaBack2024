import { GenericController } from "./genericController";
import { EntityTarget } from "typeorm";
import { PersonCategory } from "../model/PersonCategory";

class PersonCategoryController extends GenericController<EntityTarget<PersonCategory>> {

  constructor() {
    super(PersonCategory);
  }
}

export const personCategoryController = new PersonCategoryController();

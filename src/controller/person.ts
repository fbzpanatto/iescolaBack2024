import { GenericController } from "./genericController";
import { EntityTarget } from "typeorm";
import { Person } from "../model/Person";

class PersonController extends GenericController<EntityTarget<Person>> {
  constructor() {
    super(Person, { table: 'person', selectColumns: ['id', 'name', 'birth'], relations: { category: 'categoryId' }, dateColumns: ['birth'] })
  }
}

export const personController = new PersonController();

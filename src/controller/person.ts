import { GenericController } from "./genericController";
import { EntityTarget } from "typeorm";
import { Person } from "../model/Person";

class PersonController extends GenericController<EntityTarget<Person>> { constructor() { super(Person) } }

export const personController = new PersonController();

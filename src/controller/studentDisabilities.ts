import { GenericController } from "./genericController";
import { EntityTarget } from "typeorm";
import { Bimester } from "../model/Bimester";
import {StudentDisability} from "../model/StudentDisability";

class StudentDisabilitiesController extends GenericController<EntityTarget<StudentDisability>> {

  constructor() {
    super(StudentDisability);
  }
}

export const studentDisabilitiesController = new StudentDisabilitiesController();

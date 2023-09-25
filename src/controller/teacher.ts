import { GenericController } from "./genericController";
import { EntityTarget } from "typeorm";
import { Teacher } from "../model/Teacher";

class TeacherController extends GenericController<EntityTarget<Teacher>> {

  constructor() {
    super(Teacher);
  }
}

export const teacherController = new TeacherController();

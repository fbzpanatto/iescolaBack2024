import { GenericController } from "./genericController";
import { EntityTarget } from "typeorm";
import { Classroom } from "../model/Classroom";

class ClassroomController extends GenericController<EntityTarget<Classroom>> {

  constructor() {
    super(Classroom);
  }
}

export const classroomController = new ClassroomController();

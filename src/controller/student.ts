import { GenericController } from "./genericController";
import { EntityTarget } from "typeorm";
import { Student } from "../model/Student";

class StudentController extends GenericController<EntityTarget<Student>> {

  constructor() {
    super(Student);
  }
}

export const studentController = new StudentController();

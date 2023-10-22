import { GenericController } from "./genericController";
import { EntityTarget } from "typeorm";
import {StudentClassroom} from "../model/StudentClassroom";

class StudentClassroomController extends GenericController<EntityTarget<StudentClassroom>> {

  constructor() {
    super(StudentClassroom);
  }
}

export const studentClassroomController = new StudentClassroomController();

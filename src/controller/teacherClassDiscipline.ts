import { GenericController } from "./genericController";
import { EntityTarget } from "typeorm";
import { TeacherClassDiscipline } from "../model/TeacherClassDiscipline";

class TeacherClassDisciplineController extends GenericController<EntityTarget<TeacherClassDiscipline>> {

  constructor() {
    super(TeacherClassDiscipline);
  }
}

export const teacherClassDisciplineController = new TeacherClassDisciplineController();

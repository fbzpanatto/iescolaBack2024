import { GenericController } from "./genericController";
import { EntityTarget, SaveOptions } from "typeorm";
import { Teacher } from "../model/Teacher";
import { Person } from "../model/Person";
import { teacherClassDisciplineController } from "./teacherClassDiscipline";
import { TeacherClassDiscipline } from "../model/TeacherClassDiscipline";
import { classroomController } from "./classroom";
import { Classroom } from "../model/Classroom";
import { disciplineController } from "./discipline";
import { Discipline } from "../model/Discipline";

interface TeacherBody {
  name: string,
  birth: Date,
  teacherClasses: number[],
  teacherDisciplines: number[]
}

class TeacherController extends GenericController<EntityTarget<Teacher>> {

  constructor() {
    super(Teacher);
  }

  override async save(body: TeacherBody, options: SaveOptions | undefined) {
    try {
      const person = this.newPerson(body)
      const teacher = await this.repository.save(this.newTeacher(person))

      for(let classId of body.teacherClasses) {
        const classroom = (await classroomController.findOneById(classId)).data as Classroom

        for(let disciplineId of body.teacherDisciplines) {
          const discipline = (await disciplineController.findOneById(disciplineId)).data as Discipline

          const newTeacherRelations = new TeacherClassDiscipline()

          newTeacherRelations.teacher = teacher
          newTeacherRelations.classroom = classroom
          newTeacherRelations.discipline = discipline
          newTeacherRelations.startedAt = new Date()

          await teacherClassDisciplineController.save(newTeacherRelations, options)
        }
      }

      return { status: 201, data: teacher }
    } catch (error: any) { return { status: 500, message: error.message } }
  }

  newPerson(body: TeacherBody) {
    const person = new Person()
    person.name = body.name;
    person.birth = body.birth;
    return person
  }
  newTeacher(person: Person) {
    const teacher = new Teacher()
    teacher.person = person
    return teacher
  }
}

export const teacherController = new TeacherController();

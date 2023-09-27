import {GenericController} from "./genericController";
import {EntityTarget, SaveOptions} from "typeorm";
import {Teacher} from "../model/Teacher";
import {Person} from "../model/Person";
import {teacherClassDisciplineController} from "./teacherClassDiscipline";
import {TeacherClassDiscipline} from "../model/TeacherClassDiscipline";
import {classroomController} from "./classroom";
import {Classroom} from "../model/Classroom";
import {disciplineController} from "./discipline";
import {Discipline} from "../model/Discipline";
import {AppDataSource} from "../data-source";

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

  override async findAllWhere(options: any) {
    try {

      const result = await this.repository.find({
        relations: ['person', 'teacherClassDiscipline.classroom', 'teacherClassDiscipline.discipline']
      }) as Teacher[]

      return { status: 200, data: result }

    } catch (error: any) { return { status: 500, message: error.message } }
  }

  override async findOneById(id: string | number) {
    try {

      const result = await AppDataSource
        .getRepository(TeacherClassDiscipline)
        .query(this.myQuery.replace(':teacherId', id.toString()))


      if (!result) { return { status: 404, message: 'Data not found' } }

      console.log(result)

      return { status: 200, data: result }

    } catch (error: any) { return { status: 500, message: error.message } }
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

  get myQuery() {
    return "SELECT teacher.id AS teacher_id, person.id AS person_id,person.name AS person_name, person.birth AS person_birth, GROUP_CONCAT(DISTINCT classroom.id ORDER BY classroom.id ASC) AS classroom_ids, GROUP_CONCAT(DISTINCT classroom.name ORDER BY classroom.id ASC) AS classroom_names, GROUP_CONCAT(DISTINCT discipline.id ORDER BY discipline.id ASC) AS discipline_ids, GROUP_CONCAT(DISTINCT discipline.name ORDER BY discipline.id ASC) AS discipline_names FROM teacher LEFT JOIN person ON teacher.personId = person.id LEFT JOIN teacher_class_discipline ON teacher.id = teacher_class_discipline.teacherId LEFT JOIN classroom ON teacher_class_discipline.classroomId = classroom.id LEFT JOIN discipline ON teacher_class_discipline.disciplineId = discipline.id WHERE teacher.id = :teacherId"
  }
}

export const teacherController = new TeacherController();

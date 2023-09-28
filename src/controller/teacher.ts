import { GenericController } from "./genericController";
import { EntityTarget, IsNull, ObjectLiteral, SaveOptions} from "typeorm";
import { Teacher } from "../model/Teacher";
import { Person } from "../model/Person";
import { teacherClassDisciplineController } from "./teacherClassDiscipline";
import { TeacherClassDiscipline } from "../model/TeacherClassDiscipline";
import { classroomController } from "./classroom";
import { Classroom } from "../model/Classroom";
import { disciplineController } from "./discipline";
import { Discipline } from "../model/Discipline";
import { personController } from "./person";
import { enumOfPersonCategory } from "../utils/enumOfPersonCategory";
import { AppDataSource } from "../data-source";
import { PersonCategory } from "../model/PersonCategory";

interface TeacherBody { name: string, birth: Date, teacherClasses: number[], teacherDisciplines: number[], classesName?: string[], disciplinesName?: string[] }
interface TeacherResponse {id: number, person: {id: number, name: string, birth: string}, teacherClasses: number[], teacherDisciplines: number[]}

class TeacherController extends GenericController<EntityTarget<Teacher>> {

  constructor() { super(Teacher) }

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

      const result = await this.repository
        .createQueryBuilder('teacher')
        .select('teacher.id', 'teacher_id')
        .addSelect('person.id', 'person_id')
        .addSelect('person.name', 'person_name')
        .addSelect('person.birth', 'person_birth')
        .addSelect('GROUP_CONCAT(DISTINCT classroom.id ORDER BY classroom.id ASC)', 'classroom_ids')
        .addSelect('GROUP_CONCAT(DISTINCT discipline.id ORDER BY discipline.id ASC)', 'discipline_ids')
        .leftJoin('teacher.person', 'person')
        .leftJoin('teacher.teacherClassDiscipline', 'teacherClassDiscipline')
        .leftJoin('teacherClassDiscipline.classroom', 'classroom')
        .leftJoin('teacherClassDiscipline.discipline', 'discipline')
        .where('teacher.id = :teacherId AND teacherClassDiscipline.endedAt IS NULL', { teacherId: id })
        .getRawOne();

      if (!result) { return { status: 404, message: 'Data not found' } }

      let newResult = {
        id: result.teacher_id,
        person: {
          id: result.person_id,
          name: result.person_name,
          birth: result.person_birth
        },
        teacherClasses: result.classroom_ids.split(',').map((item: string) => parseInt(item)),
        teacherDisciplines: result.discipline_ids.split(',').map((item: string) => parseInt(item))
      } as TeacherResponse

      return { status: 200, data: newResult }

    } catch (error: any) { return { status: 500, message: error.message } }
  }
  override async save(body: TeacherBody, options: SaveOptions | undefined) {
    try {
      const category = await this.getTeacherCategory()
      const person = this.newPerson(body, category)
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
  async getTeacherCategory() {
    return await AppDataSource.getRepository(PersonCategory).findOne({where: {id: enumOfPersonCategory.PROFESSOR}}) as PersonCategory
  }
  async updateClassroomsRelations(teacher: Teacher, body: TeacherBody) {

    await this.createRelationIfNotExists(teacher, body)

    const teacherClassDisciplines = (await teacherClassDisciplineController.findAllWhere({
      relations: ['classroom', 'teacher'],
      where: { teacher: teacher, endedAt: IsNull() }
    })).data as TeacherClassDiscipline[]

    for(let relation of teacherClassDisciplines) {
      if(!body.teacherClasses.includes(relation.classroom.id)) {
        relation.endedAt = new Date()
        await teacherClassDisciplineController.save(relation, {})
      }
    }
  }
  async updateDisciplinesRelations(teacher: Teacher, body: TeacherBody){

    await this.createRelationIfNotExists(teacher, body)

    const teacherClassDisciplines = (await teacherClassDisciplineController.findAllWhere({
      relations: ['discipline', 'teacher'],
      where: { teacher: teacher, endedAt: IsNull() }
    })).data as TeacherClassDiscipline[]

    for(let relation of teacherClassDisciplines) {
      if(!body.teacherDisciplines.includes(relation.discipline.id)) {
        relation.endedAt = new Date()
        await teacherClassDisciplineController.save(relation, {})
      }
    }
  }
  async createRelationIfNotExists(teacher: Teacher, body: TeacherBody) {
    for(let classId of body.teacherClasses) {
      const classroom = (await classroomController.findOneById(classId)).data as Classroom
      const relationExists = (await teacherClassDisciplineController.findOneByWhere({
        where: { teacher: teacher, classroom: classroom, endedAt: IsNull() }
      })).data as TeacherClassDiscipline

      if(!relationExists) {
        for(let disciplineId of body.teacherDisciplines) {
          const discipline = (await disciplineController.findOneById(disciplineId)).data as Discipline
          const newTeacherRelations = new TeacherClassDiscipline()

          newTeacherRelations.teacher = teacher
          newTeacherRelations.classroom = classroom
          newTeacherRelations.discipline = discipline
          newTeacherRelations.startedAt = new Date()

          await teacherClassDisciplineController.save(newTeacherRelations, {})
        }
      }
    }
  }
  override async updateId(id: string, body: TeacherBody) {
    try {

      const teacher = (await this.findOneByWhere({
        relations: ['person'],
        where: { id: id }
      })).data as Teacher

      if (!teacher) { return { status: 404, message: 'Data not found' } }

      if (body.teacherClasses) { await this.updateClassroomsRelations(teacher, body) }
      if (body.teacherDisciplines) { await this.updateDisciplinesRelations(teacher, body) }

      teacher.person.name = body.name
      teacher.person.birth = body.birth
      await personController.save(teacher.person, {})

      const result = (await this.findOneById(id)).data as TeacherResponse

      return { status: 200, data: result }
    } catch (error: any) {
      return { status: 500, message: error.message }
    }
  }
  newPerson(body: TeacherBody, category: PersonCategory) {
    const person = new Person()
    person.name = body.name;
    person.birth = body.birth;
    person.category = category
    return person
  }
  newTeacher(person: Person) {
    const teacher = new Teacher()
    teacher.person = person
    return teacher
  }
}

export const teacherController = new TeacherController();

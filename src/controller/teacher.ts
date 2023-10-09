import { AppDataSource } from "../data-source";
import { GenericController } from "./genericController";
import { EntityTarget, FindManyOptions, ILike, In, IsNull, ObjectLiteral, SaveOptions } from "typeorm";
import { PersonCategory } from "../model/PersonCategory";
import { Classroom } from "../model/Classroom";
import { Discipline } from "../model/Discipline";
import { Teacher } from "../model/Teacher";
import { Person } from "../model/Person";
import { TeacherBody, TeacherResponse } from "../interfaces/interfaces";
import { TeacherClassDiscipline } from "../model/TeacherClassDiscipline";
import { teacherClassDisciplineController } from "./teacherClassDiscipline";
import { personController } from "./person";
import { enumOfPersonCategory } from "../utils/enumOfPersonCategory";
import { Request } from "express";

class TeacherController extends GenericController<EntityTarget<Teacher>> {

  constructor() { super(Teacher) }

  override async findAllWhere(options: FindManyOptions<ObjectLiteral> | undefined, request?: Request) {

    const search = request?.query.search as string

    try {
      const result = await this.repository.find({
        relations: ['person', 'teacherClassDiscipline.classroom', 'teacherClassDiscipline.discipline'],
        where: { person: { name: ILike(`%${search}%`) } }
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
        teacherClasses: result.classroom_ids?.split(',').map((item: string) => parseInt(item)) ?? [],
        teacherDisciplines: result.discipline_ids?.split(',').map((item: string) => parseInt(item)) ?? []
      } as TeacherResponse

      return { status: 200, data: newResult }

    } catch (error: any) { return { status: 500, message: error.message } }
  }
  override async save(body: TeacherBody, options: SaveOptions | undefined) {
    try {
      const category = await this.teacherCategory()
      const person = this.createPerson({ name: body.name, birth: body.birth, category })
      const teacher = await this.repository.save(this.createTeacher(person))
      const classrooms = await AppDataSource.getRepository(Classroom).findBy({id: In(body.teacherClasses)})
      const disciplines = await AppDataSource.getRepository(Discipline).findBy({id: In(body.teacherDisciplines)})

      for(let classroom of classrooms) {
        for(let discipline of disciplines) {
          const teacherClassDiscipline = new TeacherClassDiscipline()
          teacherClassDiscipline.teacher = teacher
          teacherClassDiscipline.classroom = classroom
          teacherClassDiscipline.discipline = discipline
          teacherClassDiscipline.startedAt = new Date()
          await teacherClassDisciplineController.save(teacherClassDiscipline, options)
        }
      }

      return { status: 201, data: teacher }
    } catch (error: any) { return { status: 500, message: error.message } }
  }
  override async updateId(id: string, body: TeacherBody) {
    try {

      const teacher = await AppDataSource.getRepository(Teacher).findOne({
        relations: ['person'],
        where: { id: Number(id) }
      })

      if (!teacher) { return { status: 404, message: 'Data not found' } }

      if (body.teacherClasses) { await this.updateClassRel(teacher, body) }
      if (body.teacherDisciplines) { await this.updateDisciRel(teacher, body) }

      teacher.person.name = body.name
      teacher.person.birth = body.birth
      await personController.save(teacher.person, {})

      const result = (await this.findOneById(id)).data as TeacherResponse

      return { status: 200, data: result }
    } catch (error: any) { return { status: 500, message: error.message } }
  }
  async teacherCategory() {
    return await AppDataSource.getRepository(PersonCategory).findOne({where: {id: enumOfPersonCategory.PROFESSOR}}) as PersonCategory
  }
  async updateClassRel(teacher: Teacher, body: TeacherBody) {

    await this.createRelation(teacher, body, true)

    const teacherClassDisciplines = await AppDataSource.getRepository(TeacherClassDiscipline).find({
      relations: ['classroom', 'teacher'],
      where: { endedAt: IsNull(), teacher: { id: Number(teacher.id) } }
    })

    for(let relation of teacherClassDisciplines) {
      if(!body.teacherClasses.includes(relation.classroom.id)) {
        relation.endedAt = new Date()
        await teacherClassDisciplineController.save(relation, {})
      }
    }
  }
  async updateDisciRel(teacher: Teacher, body: TeacherBody){

    await this.createRelation(teacher, body, false)

    const teacherClassDisciplines = await AppDataSource.getRepository(TeacherClassDiscipline).find({
      relations: ['discipline', 'teacher'],
      where: { endedAt: IsNull(), teacher: { id: Number(teacher.id) } }
    })

    for(let relation of teacherClassDisciplines) {
      if(!body.teacherDisciplines.includes(relation.discipline.id)) {
        relation.endedAt = new Date()
        await teacherClassDisciplineController.save(relation, {})
      }
    }
  }
  async createRelation(teacher: Teacher, body: TeacherBody, forClassroom: boolean) {

    const classrooms = await AppDataSource.getRepository(Classroom).findBy({id: In(body.teacherClasses)})
    const disciplines = await AppDataSource.getRepository(Discipline).findBy({id: In(body.teacherDisciplines)})

    if(forClassroom) {

      for(let classroom of classrooms) {

        const relationExists = (await teacherClassDisciplineController.findOneByWhere({
          where: { teacher: teacher, classroom: classroom, endedAt: IsNull() }
        })).data as TeacherClassDiscipline

        if(!relationExists) {

          for(let discipline of disciplines) {

            const newTeacherRelations = new TeacherClassDiscipline()
            newTeacherRelations.teacher = teacher
            newTeacherRelations.classroom = classroom
            newTeacherRelations.discipline = discipline
            newTeacherRelations.startedAt = new Date()

            await teacherClassDisciplineController.save(newTeacherRelations, {})
          }
        }
      }
      return
    }

    for(let discipline of disciplines) {

      const relationExists = (await teacherClassDisciplineController.findOneByWhere({
        where: { teacher: teacher, discipline: discipline, endedAt: IsNull() }
      })).data as TeacherClassDiscipline

      if(!relationExists) {
        for(let classroom of classrooms) {
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
  createTeacher(person: Person) {
    const teacher = new Teacher()
    teacher.person = person
    return teacher
  }
}

export const teacherController = new TeacherController();

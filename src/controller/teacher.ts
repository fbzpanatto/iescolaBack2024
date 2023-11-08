import { AppDataSource } from "../data-source";
import { GenericController } from "./genericController";
import {Brackets, EntityTarget, FindManyOptions, ILike, In, IsNull, ObjectLiteral, SaveOptions} from "typeorm";
import { PersonCategory } from "../model/PersonCategory";
import { Classroom } from "../model/Classroom";
import { Discipline } from "../model/Discipline";
import { Teacher } from "../model/Teacher";
import { Person } from "../model/Person";
import { TeacherBody, TeacherResponse } from "../interfaces/interfaces";
import { TeacherClassDiscipline } from "../model/TeacherClassDiscipline";
import { teacherClassDisciplineController } from "./teacherClassDiscipline";
import { personController } from "./person";
import { personCategories } from "../utils/personCategories";
import { Request } from "express";
import {User} from "../model/User";
import {StudentClassroom} from "../model/StudentClassroom";
import {transferStatus} from "../utils/transferStatus";

class TeacherController extends GenericController<EntityTarget<Teacher>> {

  constructor() { super(Teacher) }

  override async findAllWhere(options: FindManyOptions<ObjectLiteral> | undefined, request?: Request) {

    const search = request?.query.search ?? ''
    const body = request?.body as TeacherBody

    try {

      const teacher = await this.teacherByUser(body.user.user)
      if(!teacher) { return { status: 404, message: 'Você não tem permissão para acessar este recurso.' } }

      const newResult = await AppDataSource.getRepository(Teacher)
        .createQueryBuilder('teacher')
        .select([
          'teacher.id',
          'person.id',
          'person.name',
          'person.birth',
        ])
        .leftJoin('teacher.person', 'person')
        .andWhere(new Brackets(qb => {
          if(!(teacher.person.category.id === personCategories.PROFESSOR)) {
            qb.where('teacher.id > 0')
            return
          }
          qb.where('teacher.id = :teacherId', { teacherId: teacher.id })
        }))
        .andWhere('person.name LIKE :search', { search: `%${search}%` })
        .groupBy('teacher.id')
        .getMany()

      return { status: 200, data: newResult }
    } catch (error: any) { return { status: 500, message: error.message } }
  }

  // TODO: check this
  // @ts-ignore
  override async findOneById(id: string | number, request?: Request) {

    const body = request?.body as TeacherBody

    try {

      const teacher = await this.teacherByUser(body.user.user)

      if(teacher.id !== Number(id) && teacher.person.category.id === personCategories.PROFESSOR) { return { status: 401, message: 'Você não tem permissão para visualizar este registro.' } }

      const result = await this.repository
        .createQueryBuilder('teacher')
        .select('teacher.id', 'teacher_id')
        .addSelect('person.id', 'person_id')
        .addSelect('person.name', 'person_name')
        .addSelect('person.birth', 'person_birth')
        .addSelect('category.id', 'category_id')
        .addSelect('category.name', 'category_name')
        .addSelect('GROUP_CONCAT(DISTINCT classroom.id ORDER BY classroom.id ASC)', 'classroom_ids')
        .addSelect('GROUP_CONCAT(DISTINCT discipline.id ORDER BY discipline.id ASC)', 'discipline_ids')
        .leftJoin('teacher.person', 'person')
        .leftJoin("person.category", "category")
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
          birth: result.person_birth,
          category: {
            id: result.category_id,
            name: result.category_name
          }
        },
        teacherClasses: result.classroom_ids?.split(',').map((item: string) => parseInt(item)) ?? [],
        teacherDisciplines: result.discipline_ids?.split(',').map((item: string) => parseInt(item)) ?? []
      } as TeacherResponse

      return { status: 200, data: newResult }

    } catch (error: any) { return { status: 500, message: error.message } }
  }



  override async save(body: TeacherBody, options: SaveOptions | undefined) {
    try {
      const category = await AppDataSource.getRepository(PersonCategory).findOne({ where: { id: body.category.id } } ) as PersonCategory
      const person = this.createPerson({ name: body.name, birth: body.birth, category })
      const teacher = await this.repository.save(this.createTeacher(person))
      const classrooms = await AppDataSource.getRepository(Classroom).findBy({id: In(body.teacherClasses)})
      const disciplines = await AppDataSource.getRepository(Discipline).findBy({id: In(body.teacherDisciplines)})

      // TODO: Review this code
      const { username, password } = this.generateUser(person)
      await AppDataSource.getRepository(User).save({ person: person, username, password })

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

      const frontendTeacher =  await this.teacherByUser(body.user.user)
      const databaseTeacher = await AppDataSource.getRepository(Teacher).findOne({
        relations: ['person.category'],
        where: { id: Number(id) }
      })

      if (!databaseTeacher) { return { status: 404, message: 'Data not found' } }
      if(frontendTeacher.person.category.id === personCategories.PROFESSOR && frontendTeacher.id !== databaseTeacher.id) { return { status: 401, message: 'Você não tem permissão para editar este registro.' } }

      if (body.teacherClasses) { await this.updateClassRel(databaseTeacher, body) }
      if (body.teacherDisciplines) { await this.updateDisciRel(databaseTeacher, body) }

      databaseTeacher.person.name = body.name
      databaseTeacher.person.birth = body.birth
      await personController.save(databaseTeacher.person, {})

      return { status: 200, data: databaseTeacher }
    } catch (error: any) { return { status: 500, message: error.message } }
  }
  async getRequestedStudentTransfers(request?: Request) {
    try {

      const teacherClasses = await this.teacherClassrooms(request?.body.user)
      const studentClassrooms = await AppDataSource.getRepository(StudentClassroom)
        .createQueryBuilder('studentClassroom')
        .leftJoin('studentClassroom.classroom', 'classroom')
        .leftJoin('studentClassroom.student', 'student')
        .leftJoin('student.person', 'person')
        .leftJoin('student.transfers', 'transfers')
        .where('classroom.id IN (:...ids)', { ids: teacherClasses.classrooms })
        .andWhere('studentClassroom.endedAt IS NULL')
        .andWhere('transfers.endedAt IS NULL')
        .andWhere('transfers.status = :status', { status: transferStatus.PENDING })
        .getCount()

      return { status: 200, data: studentClassrooms }

    } catch (error: any) { return { status: 500, message: error.message } }
  }
  async teacherCategory() {
    return await AppDataSource.getRepository(PersonCategory).findOne({where: {id: personCategories.PROFESSOR}}) as PersonCategory
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
  generateUser(person: Person) {
    const username = person.name.substring(0, 10).replace(/\s/g, '').trim()
    const password = this.generatePassword(8);
    return { username, password };
  }
  generatePassword(length: number) {
    const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
    let randomString = '';
    for (let i = 0; i < length; i++) {
      const randomIndex = Math.floor(Math.random() * charset.length);
      randomString += charset[randomIndex];
    }
    return randomString;
  }
}

export const teacherController = new TeacherController();

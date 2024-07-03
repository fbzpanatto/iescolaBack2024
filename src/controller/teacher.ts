import { AppDataSource } from "../data-source";
import { GenericController } from "./genericController";
import { Brackets, EntityTarget, FindManyOptions, In, IsNull, ObjectLiteral, SaveOptions } from "typeorm";
import { PersonCategory } from "../model/PersonCategory";
import { Classroom } from "../model/Classroom";
import { Discipline } from "../model/Discipline";
import { Teacher } from "../model/Teacher";
import { Person } from "../model/Person";
import { TeacherBody, TeacherResponse } from "../interfaces/interfaces";
import { TeacherClassDiscipline } from "../model/TeacherClassDiscipline";
import { teacherClassDisciplineController } from "./teacherClassDiscipline";
import { personCategories } from "../utils/personCategories";
import { Request } from "express";
import { User } from "../model/User";
import { StudentClassroom } from "../model/StudentClassroom";
import { transferStatus } from "../utils/transferStatus";

class TeacherController extends GenericController<EntityTarget<Teacher>> {

  constructor() { super(Teacher) }

  override async findAllWhere(options: FindManyOptions<ObjectLiteral> | undefined, request?: Request) {

    const search = request?.query.search ?? ''
    const body = request?.body as TeacherBody

    try {

      const teacher = await this.teacherByUser(body.user.user)
      const teacherClasses = await this.teacherClassrooms(body?.user)
      const notInCategories = [personCategories.ADMINISTRADOR, personCategories.SUPERVISOR]

      const newResult = await AppDataSource.getRepository(Teacher)
        .createQueryBuilder('teacher')
        .leftJoinAndSelect('teacher.person', 'person')
        .leftJoinAndSelect('person.category', 'category')
        .leftJoin('teacher.teacherClassDiscipline', 'teacherClassDiscipline')
        .leftJoin('teacherClassDiscipline.classroom', 'classroom')
        .where(new Brackets(qb => {

          if (teacher.person.category.id === personCategories.PROFESSOR) {
            qb.where('teacher.id = :teacherId', { teacherId: teacher.id })
            return
          }

          if (teacher.person.category.id != personCategories.ADMINISTRADOR && teacher.person.category.id != personCategories.SUPERVISOR) {
            qb.where('category.id NOT IN (:...categoryIds)', { categoryIds: notInCategories })
              .andWhere('classroom.id IN (:...classroomIds)', { classroomIds: teacherClasses.classrooms })
              .andWhere('teacherClassDiscipline.endedAt IS NULL')
            return
          }

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
      const cannotChange = [personCategories.MONITOR_DE_INFORMATICA, personCategories.PROFESSOR]

      if (teacher.id !== Number(id) && cannotChange.includes(teacher.person.category.id)) { return { status: 403, message: 'Você não tem permissão para visualizar este registro.' } }

      const result = await this.repository
        .createQueryBuilder('teacher')
        .select('teacher.id', 'teacher_id')
        .addSelect('teacher.email', 'teacher_email')
        .addSelect('teacher.register', 'teacher_register')
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
        email: result.teacher_email,
        register: result.teacher_register,
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

      const user = await this.teacherByUser(body.user.user) as Teacher

      if (body.register) {
        const registerExists = await AppDataSource.getRepository(Teacher).findOne({ where: { register: body.register } })
        if (registerExists) { return { status: 409, message: 'Já existe um registro com este número de matricula.' } }
      }

      if (body.email) {
        const emailExists = await AppDataSource.getRepository(Teacher).findOne({ where: { email: body.email } })
        if (emailExists) { return { status: 409, message: 'Já existe um registro com este email.' } }
      }

      if (user.person.category.id === personCategories.SECRETARIO) {
        const canCreate = [personCategories.PROFESSOR, personCategories.MONITOR_DE_INFORMATICA]
        if (!canCreate.includes(body.category.id)) { return { status: 403, message: 'Você não tem permissão para criar uma pessoa com esta categoria.' } }
      }

      if (user.person.category.id === personCategories.COORDENADOR) {
        const canCreate = [personCategories.PROFESSOR, personCategories.MONITOR_DE_INFORMATICA, personCategories.SECRETARIO]
        if (!canCreate.includes(body.category.id)) { return { status: 403, message: 'Você não tem permissão para criar uma pessoa com esta categoria.' } }
      }

      if (user.person.category.id === personCategories.VICE_DIRETOR) {
        const canCreate = [personCategories.PROFESSOR, personCategories.MONITOR_DE_INFORMATICA, personCategories.SECRETARIO, personCategories.COORDENADOR]
        if (!canCreate.includes(body.category.id)) { return { status: 403, message: 'Você não tem permissão para criar uma pessoa com esta categoria.' } }
      }

      if (user.person.category.id === personCategories.DIRETOR) {
        const canCreate = [personCategories.PROFESSOR, personCategories.MONITOR_DE_INFORMATICA, personCategories.SECRETARIO, personCategories.COORDENADOR, personCategories.VICE_DIRETOR]
        if (!canCreate.includes(body.category.id)) { return { status: 403, message: 'Você não tem permissão para criar uma pessoa com esta categoria.' } }
      }

      if (user.person.category.id === personCategories.SUPERVISOR) {
        const canCreate = [personCategories.PROFESSOR, personCategories.MONITOR_DE_INFORMATICA, personCategories.SECRETARIO, personCategories.COORDENADOR, personCategories.VICE_DIRETOR, personCategories.DIRETOR]
        if (!canCreate.includes(body.category.id)) { return { status: 403, message: 'Você não tem permissão para criar uma pessoa com esta categoria.' } }
      }

      if (user.person.category.id === personCategories.ADMINISTRADOR) {
        const canCreate = [personCategories.PROFESSOR, personCategories.MONITOR_DE_INFORMATICA, personCategories.SECRETARIO, personCategories.COORDENADOR, personCategories.VICE_DIRETOR, personCategories.DIRETOR, personCategories.SUPERVISOR, personCategories.ADMINISTRADOR]
        if (!canCreate.includes(body.category.id)) { return { status: 403, message: 'Você não tem permissão para criar uma pessoa com esta categoria.' } }
      }

      const category = await AppDataSource.getRepository(PersonCategory).findOne({ where: { id: body.category.id } }) as PersonCategory
      const person = this.createPerson({ name: body.name, birth: body.birth, category })
      const teacher = await this.repository.save(this.createTeacher(person, body))
      const classrooms = await AppDataSource.getRepository(Classroom).findBy({ id: In(body.teacherClasses) })
      const disciplines = await AppDataSource.getRepository(Discipline).findBy({ id: In(body.teacherDisciplines) })
      const { username, password } = this.generateUser(person)
      await AppDataSource.getRepository(User).save({ person: person, username, password })

      if (body.category.id === personCategories.ADMINISTRADOR || body.category.id === personCategories.SUPERVISOR) { return { status: 201, data: teacher } }

      for (let classroom of classrooms) {
        for (let discipline of disciplines) {
          const teacherClassDiscipline = new TeacherClassDiscipline()
          teacherClassDiscipline.teacher = teacher
          teacherClassDiscipline.classroom = classroom
          teacherClassDiscipline.discipline = discipline
          teacherClassDiscipline.startedAt = new Date()
          await teacherClassDisciplineController.save(teacherClassDiscipline, options)
        }
      }

      return { status: 201, data: teacher }
    } catch (error: any) {
      return { status: 500, message: error.message }
    }
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
    return await AppDataSource.getRepository(PersonCategory).findOne({ where: { id: personCategories.PROFESSOR } }) as PersonCategory
  }

  override async updateId(id: string, body: TeacherBody) {
    try {

      const frontendTeacher = await this.teacherByUser(body.user.user)
      const databaseTeacher = await AppDataSource.getRepository(Teacher).findOne({
        relations: ['person.category'],
        where: { id: Number(id) }
      })

      if (!databaseTeacher) { return { status: 404, message: 'Data not found' } }

      if (frontendTeacher.person.category.id === personCategories.SECRETARIO) {
        const canEdit = [personCategories.PROFESSOR, personCategories.MONITOR_DE_INFORMATICA]
        if (!canEdit.includes(databaseTeacher?.person.category.id)) { return { status: 403, message: 'Você não tem permissão para editar uma pessoa dessa categoria. Solicite a alguém com cargo um cargo superior ao seu.' } }
      }

      if (frontendTeacher.person.category.id === personCategories.COORDENADOR) {
        const canEdit = [personCategories.PROFESSOR, personCategories.MONITOR_DE_INFORMATICA, personCategories.SECRETARIO]
        if (!canEdit.includes(databaseTeacher?.person.category.id)) { return { status: 403, message: 'Você não tem permissão para editar uma pessoa dessa categoria. Solicite a alguém com cargo um cargo superior ao seu.' } }
      }

      if (frontendTeacher.person.category.id === personCategories.VICE_DIRETOR) {
        const canEdit = [personCategories.PROFESSOR, personCategories.MONITOR_DE_INFORMATICA, personCategories.SECRETARIO, personCategories.COORDENADOR]
        if (!canEdit.includes(databaseTeacher?.person.category.id)) { return { status: 403, message: 'Você não tem permissão para editar uma pessoa dessa categoria. Solicite a alguém com cargo um cargo superior ao seu.' } }
      }

      if (frontendTeacher.person.category.id === personCategories.DIRETOR) {
        const canEdit = [personCategories.PROFESSOR, personCategories.MONITOR_DE_INFORMATICA, personCategories.SECRETARIO, personCategories.COORDENADOR, personCategories.VICE_DIRETOR]
        if (!canEdit.includes(databaseTeacher?.person.category.id)) { return { status: 403, message: 'Você não tem permissão para editar uma pessoa dessa categoria. Solicite a alguém com cargo um cargo superior ao seu.' } }
      }

      if (frontendTeacher.person.category.id === personCategories.SUPERVISOR) {
        const canEdit = [personCategories.PROFESSOR, personCategories.MONITOR_DE_INFORMATICA, personCategories.SECRETARIO, personCategories.COORDENADOR, personCategories.VICE_DIRETOR, personCategories.DIRETOR]
        if (!canEdit.includes(databaseTeacher?.person.category.id)) { return { status: 403, message: 'Você não tem permissão para editar uma pessoa dessa categoria. Solicite a alguém com cargo um cargo superior ao seu.' } }
      }

      if (frontendTeacher.person.category.id === personCategories.ADMINISTRADOR) {
        const canEdit = [personCategories.PROFESSOR, personCategories.MONITOR_DE_INFORMATICA, personCategories.SECRETARIO, personCategories.COORDENADOR, personCategories.VICE_DIRETOR, personCategories.DIRETOR, personCategories.SUPERVISOR, personCategories.ADMINISTRADOR]
        if (!canEdit.includes(databaseTeacher?.person.category.id)) { return { status: 403, message: 'Você não tem permissão para editar uma pessoa dessa categoria. Solicite a alguém com cargo um cargo superior ao seu.' } }
      }

      if (frontendTeacher.person.category.id === personCategories.PROFESSOR || frontendTeacher.person.category.id === personCategories.MONITOR_DE_INFORMATICA && frontendTeacher.id !== databaseTeacher.id) { return { status: 403, message: 'Você não tem permissão para editar este registro.' } }

      databaseTeacher.person.name = body.name
      databaseTeacher.person.birth = body.birth

      if (databaseTeacher.person.category.id === personCategories.ADMINISTRADOR || databaseTeacher.person.category.id === personCategories.SUPERVISOR) {
        await AppDataSource.getRepository(Teacher).save(databaseTeacher)
        return { status: 200, data: databaseTeacher }
      }

      if (body.teacherClasses || body.teacherDisciplines) { await this.updateRelation(databaseTeacher, body) }

      await AppDataSource.getRepository(Teacher).save(databaseTeacher)

      return { status: 200, data: databaseTeacher }
    } catch (error: any) { return { status: 500, message: error.message } }
  }

  async updateRelation(teacher: Teacher, body: TeacherBody) {

    const teacherClassDisciplines = await AppDataSource.getRepository(TeacherClassDiscipline).find({
      relations: ['teacher', 'classroom', 'discipline'],
      where: { endedAt: IsNull(), teacher: { id: Number(teacher.id) } }
    });
  
    const arrOfDiff: TeacherClassDiscipline[] = [];
    const classroomsBody = body.teacherClasses.map((el: any) => parseInt(el));
    const disciplinesBody = body.teacherDisciplines.map((el: any) => parseInt(el));
  
    const existingRelations = new Set(
      teacherClassDisciplines.map(relation => `${relation.classroom.id}-${relation.discipline.id}`)
    );

    const requestedRelations = new Set(
      classroomsBody.flatMap(classroomId =>
        disciplinesBody.map(disciplineId => `${classroomId}-${disciplineId}`)
      )
    );
  
    // Encontrar relações a serem encerradas
    for (let relation of teacherClassDisciplines) {
      const relationKey = `${relation.classroom.id}-${relation.discipline.id}`;
      if (!requestedRelations.has(relationKey)) {
        arrOfDiff.push(relation);
      }
    }
  
    // Encerrar relações que estão em arrOfDiff
    for (let relation of arrOfDiff) {
      await teacherClassDisciplineController.updateId(relation.id, { endedAt: new Date() });
    }
  
    // Criar novas relações conforme o corpo da requisição
    for (let classroomId of classroomsBody) {
      for (let disciplineId of disciplinesBody) {
        const relationKey = `${classroomId}-${disciplineId}`;
        if (!existingRelations.has(relationKey)) {
          const newTeacherRelation = new TeacherClassDiscipline();
          newTeacherRelation.teacher = teacher;
          newTeacherRelation.classroom = await AppDataSource.getRepository(Classroom).findOne({ where: { id: classroomId } }) as Classroom
          newTeacherRelation.discipline = await AppDataSource.getRepository(Discipline).findOne({ where: { id: disciplineId } })as Discipline
          newTeacherRelation.startedAt = new Date();
  
          await teacherClassDisciplineController.save(newTeacherRelation, {});
        }
      }
    }
  }
  
  async createRelation(teacher: Teacher, body: TeacherBody) {
    const classrooms = await AppDataSource.getRepository(Classroom).findBy({ id: In(body.teacherClasses) });
    const disciplines = await AppDataSource.getRepository(Discipline).findBy({ id: In(body.teacherDisciplines) });
  
    for (let classroom of classrooms) {
      for (let discipline of disciplines) {
        const relationExists = await AppDataSource.getRepository(TeacherClassDiscipline).findOne({
          where: {
            teacher: { id: teacher.id },
            classroom: { id: classroom.id },
            discipline: { id: discipline.id },
            endedAt: IsNull()
          }
        });
  
        if (!relationExists) {
          const newTeacherRelation = new TeacherClassDiscipline();
          newTeacherRelation.teacher = teacher;
          newTeacherRelation.classroom = classroom;
          newTeacherRelation.discipline = discipline;
          newTeacherRelation.startedAt = new Date();
  
          await teacherClassDisciplineController.save(newTeacherRelation, {});
        }
      }
    }
  }

  createTeacher(person: Person, body: TeacherBody) {
    const teacher = new Teacher()
    teacher.person = person
    teacher.email = body.email
    teacher.register = body.register
    return teacher
  }

  generateUser(person: Person) {
    const username = person.name.substring(0, 20).replace(/\s/g, '').trim()
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

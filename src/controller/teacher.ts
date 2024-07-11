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
import { Request } from "express";
import { User } from "../model/User";
import { StudentClassroom } from "../model/StudentClassroom";
import { transferStatus } from "../utils/transferStatus";
import { disciplineController } from "./discipline";
import { classroomController } from "./classroom";
import { pc } from "../utils/personCategories";
import { personCategoryController } from "./personCategory";
import { mainEmail } from "../utils/email.service";

class TeacherController extends GenericController<EntityTarget<Teacher>> {

  constructor() { super(Teacher) }

  async teacherForm(req: Request) {

    let disciplines; let classrooms; let personCategories;

    try {

      await AppDataSource.transaction(async (transaction) => {
        disciplines = (await disciplineController.getAllDisciplines(req, transaction)).data;
        classrooms = (await classroomController.findAllWhere({}, req, transaction)).data;
        personCategories = (await personCategoryController.findAllWhere({}, req, transaction)).data;
      })

      return { status: 200, data: { disciplines, classrooms, personCategories } }
    } catch (error: any) { return { status: 500, message: error.message } }
  }

  override async findAllWhere( _: FindManyOptions<ObjectLiteral> | undefined, request?: Request ) {
    const search = request?.query.search ?? "";
    const body = request?.body as TeacherBody;

    try {
      const teacher = await this.teacherByUser(body.user.user);
      const teacherClasses = await this.teacherClassrooms(body?.user);
      const notInCategories = [pc.ADMINISTRADOR, pc.SUPERVISOR];

      const newResult = await AppDataSource.getRepository(Teacher)
        .createQueryBuilder("teacher")
        .leftJoinAndSelect("teacher.person", "person")
        .leftJoinAndSelect("person.category", "category")
        .leftJoin("teacher.teacherClassDiscipline", "teacherClassDiscipline")
        .leftJoin("teacherClassDiscipline.classroom", "classroom")
        .where(
          new Brackets((qb) => {
            if (teacher.person.category.id === pc.PROFESSOR) {
              qb.where("teacher.id = :teacherId", { teacherId: teacher.id });
              return;
            }

            if ( teacher.person.category.id != pc.ADMINISTRADOR && teacher.person.category.id != pc.SUPERVISOR ) {
              qb.where("category.id NOT IN (:...categoryIds)", { categoryIds: notInCategories })
                .andWhere("classroom.id IN (:...classroomIds)", { classroomIds: teacherClasses.classrooms })
                .andWhere("teacherClassDiscipline.endedAt IS NULL");
              return;
            }
          }),
        )
        .andWhere("person.name LIKE :search", { search: `%${search}%` })
        .groupBy("teacher.id")
        .getMany();

      return { status: 200, data: newResult };
    } catch (error: any) { return { status: 500, message: error.message } }
  }

  // TODO: check this
  // @ts-ignore
  override async findOneById(id: string | number, request?: Request) {
    const body = request?.body as TeacherBody;

    try {
      const teacher = await this.teacherByUser(body.user.user);
      const cannotChange = [pc.MONITOR_DE_INFORMATICA, pc.PROFESSOR];

      if (
        teacher.id !== Number(id) &&
        cannotChange.includes(teacher.person.category.id)
      ) {
        return {
          status: 403,
          message: "Você não tem permissão para visualizar este registro.",
        };
      }

      const result = await this.repository
        .createQueryBuilder("teacher")
        .select("teacher.id", "teacher_id")
        .addSelect("teacher.email", "teacher_email")
        .addSelect("teacher.register", "teacher_register")
        .addSelect("person.id", "person_id")
        .addSelect("person.name", "person_name")
        .addSelect("person.birth", "person_birth")
        .addSelect("category.id", "category_id")
        .addSelect("category.name", "category_name")
        .addSelect(
          "GROUP_CONCAT(DISTINCT classroom.id ORDER BY classroom.id ASC)",
          "classroom_ids",
        )
        .addSelect(
          "GROUP_CONCAT(DISTINCT discipline.id ORDER BY discipline.id ASC)",
          "discipline_ids",
        )
        .leftJoin("teacher.person", "person")
        .leftJoin("person.category", "category")
        .leftJoin("teacher.teacherClassDiscipline", "teacherClassDiscipline")
        .leftJoin("teacherClassDiscipline.classroom", "classroom")
        .leftJoin("teacherClassDiscipline.discipline", "discipline")
        .where(
          "teacher.id = :teacherId AND teacherClassDiscipline.endedAt IS NULL",
          { teacherId: id },
        )
        .getRawOne();

      if (!result) {
        return { status: 404, message: "Data not found" };
      }

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
            name: result.category_name,
          },
        },
        teacherClasses:
          result.classroom_ids
            ?.split(",")
            .map((item: string) => parseInt(item)) ?? [],
        teacherDisciplines:
          result.discipline_ids
            ?.split(",")
            .map((item: string) => parseInt(item)) ?? [],
      } as TeacherResponse;

      return { status: 200, data: newResult };
    } catch (error: any) {
      return { status: 500, message: error.message };
    }
  }

  async getRequestedStudentTransfers(request?: Request) {
    try {
      const teacherClasses = await this.teacherClassrooms(request?.body.user);
      const studentClassrooms = await AppDataSource.getRepository(
        StudentClassroom,
      )
        .createQueryBuilder("studentClassroom")
        .leftJoin("studentClassroom.classroom", "classroom")
        .leftJoin("studentClassroom.student", "student")
        .leftJoin("student.person", "person")
        .leftJoin("student.transfers", "transfers")
        .where("classroom.id IN (:...ids)", { ids: teacherClasses.classrooms })
        .andWhere("studentClassroom.endedAt IS NULL")
        .andWhere("transfers.endedAt IS NULL")
        .andWhere("transfers.status = :status", {
          status: transferStatus.PENDING,
        })
        .getCount();

      return { status: 200, data: studentClassrooms };
    } catch (error: any) {
      return { status: 500, message: error.message };
    }
  }

  override async updateId(id: string, body: TeacherBody) {
    try {
      const frontendTeacher = await this.teacherByUser(body.user.user)

      const databaseTeacher = await AppDataSource.getRepository(Teacher).findOne({relations: ["person.category"],where: { id: Number(id) }})

      if (!databaseTeacher) {return { status: 404, message: "Data not found" }}

      const message = "Você não tem permissão para editar uma pessoa dessa categoria. Solicite a alguém com cargo um cargo superior ao seu."
      if (!this.hasPermissionToCreate(frontendTeacher.person.category.id, databaseTeacher.person.category.id)) { return { status: 403, message }}

      if (frontendTeacher.person.category.id === pc.PROFESSOR || (frontendTeacher.person.category.id === pc.MONITOR_DE_INFORMATICA && frontendTeacher.id !== databaseTeacher.id)) {
        return { status: 403, message: "Você não tem permissão para editar este registro." };
      }

      databaseTeacher.person.name = body.name;
      databaseTeacher.person.birth = body.birth;

      if ( databaseTeacher.person.category.id === pc.ADMINISTRADOR || databaseTeacher.person.category.id === pc.SUPERVISOR ) {
        await AppDataSource.getRepository(Teacher).save(databaseTeacher);
        return { status: 200, data: databaseTeacher };
      }

      if (body.teacherClasses || body.teacherDisciplines) { await this.updateRelation(databaseTeacher, body) }

      await AppDataSource.getRepository(Teacher).save(databaseTeacher);

      return { status: 200, data: databaseTeacher };
    } catch ( error: any ) { return { status: 500, message: error.message } }
  }

  async updateRelation(teacher: Teacher, body: TeacherBody) {

    const teacherClassDisciplines = await AppDataSource
    .getRepository(TeacherClassDiscipline)
    .find({ relations: ["teacher", "classroom", "discipline"], where: { endedAt: IsNull(), teacher: { id: Number(teacher.id) } } });

    const arrOfDiff: TeacherClassDiscipline[] = [];
    const classroomsBody = body.teacherClasses.map((el: any) => parseInt(el));
    const disciplinesBody = body.teacherDisciplines.map((el: any) => parseInt(el) );

    const existingRelations = new Set(teacherClassDisciplines.map((relation) => `${relation.classroom.id}-${relation.discipline.id}`));

    const requestedRelations = new Set(classroomsBody.flatMap((classroomId) => disciplinesBody.map((disciplineId) => `${classroomId}-${disciplineId}`) ) );

    // Encontrar relações a serem encerradas
    for (let relation of teacherClassDisciplines) {
      const relationKey = `${relation.classroom.id}-${relation.discipline.id}`;
      if (!requestedRelations.has(relationKey)) { arrOfDiff.push(relation) }
    }

    // Encerrar relações que estão em arrOfDiff
    for (let relation of arrOfDiff) { await teacherClassDisciplineController.updateId(relation.id, { endedAt: new Date() }) }

    // Criar novas relações conforme o corpo da requisição
    for (let classroomId of classroomsBody) {
      for (let disciplineId of disciplinesBody) {
        const relationKey = `${classroomId}-${disciplineId}`;
        if (!existingRelations.has(relationKey)) {
          const newTeacherRelation = new TeacherClassDiscipline();
          newTeacherRelation.teacher = teacher;
          newTeacherRelation.classroom = (await AppDataSource.getRepository(Classroom).findOne({ where: { id: classroomId } })) as Classroom;
          newTeacherRelation.discipline = (await AppDataSource.getRepository(Discipline).findOne({ where: { id: disciplineId } })) as Discipline;
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

        const relationExists = await AppDataSource
          .getRepository( TeacherClassDiscipline )
          .findOne({ where: { teacher: { id: teacher.id }, classroom: { id: classroom.id }, discipline: { id: discipline.id }, endedAt: IsNull() } });

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

  async saveTeacher(body: TeacherBody, options: SaveOptions | undefined) {
    try {
      const teacherUserFromFront = (await this.teacherByUser(body.user.user )) as Teacher;

      const message = "Você não tem permissão para criar uma pessoa com esta categoria."
      if (!this.hasPermissionToCreate(teacherUserFromFront.person.category.id,body.category.id)) { return { status: 403, message }}

      return await AppDataSource.transaction(async (transaction) => {
        const registerExists = await transaction.findOne(Teacher, { where: { register: body.register } });

        const message = "Já existe um registro com este número de matrícula."
        if (registerExists) { return { status: 409,  message } }

        const emailExists = await transaction.findOne(Teacher, {where: { email: body.email }});
        if (emailExists) {return {status: 409,message: "Já existe um registro com este email."}}

        const category = (await transaction.findOne(PersonCategory, {where: { id: body.category.id }})) as PersonCategory;

        const person = this.createPerson({name: body.name,birth: body.birth,category});

        const teacher = await transaction.save(Teacher,this.createTeacher(person, body));

        const { username, password, email } = this.generateUser(body);
        await transaction.save(User, { person, username, email, password });

        if (body.category.id === pc.ADMINISTRADOR || body.category.id === pc.SUPERVISOR ) { return { status: 201, data: teacher } }

        const classrooms = await transaction.findBy(Classroom, {id: In(body.teacherClasses) });
        const disciplines = await transaction.findBy(Discipline, { id: In(body.teacherDisciplines) });

        for (const classroom of classrooms) {
          for (const discipline of disciplines) {
            const teacherClassDiscipline = new TeacherClassDiscipline();
            teacherClassDiscipline.teacher = teacher;
            teacherClassDiscipline.classroom = classroom;
            teacherClassDiscipline.discipline = discipline;
            teacherClassDiscipline.startedAt = new Date();
            await transaction.save(teacherClassDiscipline);
          }
        }

        await mainEmail(body.email, password, true).catch((e) => console.log(e) );
        return { status: 201, data: teacher };
      });
    } catch (error: any) { return { status: 500, message: error.message } }
  }

  createTeacher(person: Person, body: TeacherBody) {
    const teacher = new Teacher();
    teacher.person = person;
    teacher.email = body.email;
    teacher.register = body.register;
    return teacher;
  }

  generateUser(body: TeacherBody) {
    const username = body.email;
    const email = body.email;
    const password = this.generatePassword();
    return { username, password, email };
  }

  generatePassword() {
    const lowercaseLetters = "abcdefghijklmnopqrstuvwxyz";
    const uppercaseLetters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const numbers = "0123456789";
    const allCharacters = lowercaseLetters + uppercaseLetters + numbers;

    let password = "";
    for (let i = 0; i < 8; i++) {
      const randomIndex = Math.floor(Math.random() * allCharacters.length);
      password += allCharacters[randomIndex];
    }

    return password;
  }

  private hasPermissionToCreate( userTeacherCategory: number, teacherDatabaseCategory: number ): boolean {

    const allowedCategories = [
      pc.PROFESSOR,
      pc.MONITOR_DE_INFORMATICA,
      pc.SECRETARIO,
      pc.COORDENADOR,
      pc.VICE_DIRETOR,
      pc.DIRETOR,
      pc.SUPERVISOR,
      pc.ADMINISTRADOR,
    ];

    let canCreate = allowedCategories.includes(teacherDatabaseCategory);

    if (userTeacherCategory === pc.SECRETARIO) {
      canCreate = canCreate && [pc.PROFESSOR, pc.MONITOR_DE_INFORMATICA].includes(teacherDatabaseCategory);
    } else if (userTeacherCategory === pc.COORDENADOR) {
      canCreate = canCreate && [pc.PROFESSOR, pc.MONITOR_DE_INFORMATICA, pc.SECRETARIO].includes(teacherDatabaseCategory );
    } else if (userTeacherCategory === pc.VICE_DIRETOR) {
      canCreate = canCreate && [ pc.PROFESSOR, pc.MONITOR_DE_INFORMATICA, pc.SECRETARIO, pc.COORDENADOR].includes(teacherDatabaseCategory);
    } else if (userTeacherCategory === pc.DIRETOR) {
      canCreate = canCreate && [ pc.PROFESSOR, pc.MONITOR_DE_INFORMATICA, pc.SECRETARIO, pc.COORDENADOR, pc.VICE_DIRETOR ].includes(teacherDatabaseCategory);
    } else if (userTeacherCategory === pc.SUPERVISOR) {
      canCreate = canCreate && [ pc.PROFESSOR, pc.MONITOR_DE_INFORMATICA, pc.SECRETARIO, pc.COORDENADOR, pc.VICE_DIRETOR, pc.DIRETOR].includes(teacherDatabaseCategory);
    }
    return canCreate;
  }
}

export const teacherController = new TeacherController();

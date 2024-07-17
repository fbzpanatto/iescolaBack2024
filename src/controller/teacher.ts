import { AppDataSource } from "../data-source";
import { GenericController } from "./genericController";
import { Brackets, EntityTarget, FindManyOptions, In, IsNull, ObjectLiteral } from "typeorm";
import { PersonCategory } from "../model/PersonCategory";
import { Classroom } from "../model/Classroom";
import { Discipline } from "../model/Discipline";
import { Teacher } from "../model/Teacher";
import { Person } from "../model/Person";
import { TeacherBody, TeacherResponse } from "../interfaces/interfaces";
import { TeacherClassDiscipline as TCDRelation } from "../model/TeacherClassDiscipline";
import { teacherRelationController } from "./teacherClassDiscipline";
import { Request } from "express";
import { User } from "../model/User";
import { StudentClassroom } from "../model/StudentClassroom";
import { transferStatus } from "../utils/transferStatus";
import { discController } from "./discipline";
import { classroomController } from "./classroom";
import { pc } from "../utils/personCategories";
import { pCatCtrl } from "./personCategory";
import { credentialsEmail } from "../utils/email.service";

class TeacherController extends GenericController<EntityTarget<Teacher>> {

  constructor() { super(Teacher) }

  async teacherForm(req: Request) {

    let disciplines; let classrooms; let personCategories;

    try {

      await AppDataSource.transaction(async (CONN) => {
        disciplines = (await discController.getAllDisciplines(req, CONN)).data;
        classrooms = (await classroomController.getAllClassrooms(req, CONN)).data;
        personCategories = (await pCatCtrl.findAllPerCat(req, CONN)).data;
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
      const notInCategories = [pc.ADMN, pc.SUPE];

      const newResult = await AppDataSource.getRepository(Teacher)
        .createQueryBuilder("teacher")
        .leftJoinAndSelect("teacher.person", "person")
        .leftJoinAndSelect("person.category", "category")
        .leftJoin("teacher.teacherClassDiscipline", "teacherClassDiscipline")
        .leftJoin("teacherClassDiscipline.classroom", "classroom")
        .where(
          new Brackets((qb) => {
            if (teacher.person.category.id === pc.PROF) { qb.where("teacher.id = :teacherId", { teacherId: teacher.id }); return }
            if ( teacher.person.category.id != pc.ADMN && teacher.person.category.id != pc.SUPE ) {
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
      const cannotChange = [pc.MONI, pc.PROF];

      if ( teacher.id !== Number(id) && cannotChange.includes(teacher.person.category.id) ) { return { status: 403, message: "Você não tem permissão para visualizar este registro." } }

      const el = await this.repository
        .createQueryBuilder("teacher")
        .select("teacher.id", "teacher_id")
        .addSelect("teacher.email", "teacher_email")
        .addSelect("teacher.register", "teacher_register")
        .addSelect("person.id", "person_id")
        .addSelect("person.name", "person_name")
        .addSelect("person.birth", "person_birth")
        .addSelect("category.id", "category_id")
        .addSelect("category.name", "category_name")
        .addSelect("GROUP_CONCAT(DISTINCT classroom.id ORDER BY classroom.id ASC)","classroom_ids")
        .addSelect("GROUP_CONCAT(DISTINCT discipline.id ORDER BY discipline.id ASC)","discipline_ids")
        .leftJoin("teacher.person", "person")
        .leftJoin("person.category", "category")
        .leftJoin("teacher.teacherClassDiscipline", "teacherClassDiscipline")
        .leftJoin("teacherClassDiscipline.classroom", "classroom")
        .leftJoin("teacherClassDiscipline.discipline", "discipline")
        .where("teacher.id = :teacherId AND teacherClassDiscipline.endedAt IS NULL", { teacherId: id })
        .getRawOne();

      if (!el) { return { status: 404, message: "Dado não encontrado" } }

      let newResult = {
        id: el.teacher_id,
        email: el.teacher_email,
        register: el.teacher_register,
        person: { id: el.person_id, name: el.person_name, birth: el.person_birth, category: { id: el.category_id, name: el.category_name } },
        teacherClasses:el.classroom_ids?.split(",").map((item: string) => parseInt(item)) ?? [],
        teacherDisciplines:el.discipline_ids?.split(",").map((item: string) => parseInt(item)) ?? [] 
      } as TeacherResponse;

      return { status: 200, data: newResult };
    } catch (error: any) { return { status: 500, message: error.message } }
  }

  async getRequestedStudentTransfers(request?: Request) {
    try {

      const teacherClasses = await this.teacherClassrooms(request?.body.user);
      const studentClassrooms = await AppDataSource.getRepository(StudentClassroom)
        .createQueryBuilder("studentClassroom")
        .leftJoin("studentClassroom.classroom", "classroom")
        .leftJoin("studentClassroom.student", "student")
        .leftJoin("student.person", "person")
        .leftJoin("student.transfers", "transfers")
        .where("classroom.id IN (:...ids)", { ids: teacherClasses.classrooms })
        .andWhere("studentClassroom.endedAt IS NULL")
        .andWhere("transfers.endedAt IS NULL")
        .andWhere("transfers.status = :status", { status: transferStatus.PENDING })
        .getCount();

      return { status: 200, data: studentClassrooms }
    } catch (error: any) { return { status: 500, message: error.message } }
  }

  override async updateId(id: string, body: TeacherBody) {
    try {
      const tUser = await this.teacherByUser(body.user.user)

      const teacher = await AppDataSource.getRepository(Teacher).findOne({relations: ["person.category"], where: { id: Number(id) }})

      if (!teacher) { return { status: 404, message: "Data not found" } }

      const message = "Você não tem permissão para editar as informações selecionadas. Solicite a alguém com cargo superior ao seu."
      if (!this.canChange(tUser.person.category.id, teacher.person.category.id)) { return { status: 403, message }}

      if (tUser.person.category.id === pc.PROF || (tUser.person.category.id === pc.MONI && tUser.id !== teacher.id)) {
        return { status: 403, message: "Você não tem permissão para editar este registro." };
      }

      teacher.person.name = body.name; teacher.person.birth = body.birth;
      teacher.updatedAt = new Date(); teacher.updatedByUser = tUser.person.user.id

      if ( teacher.person.category.id === pc.ADMN || teacher.person.category.id === pc.SUPE ) {
        await AppDataSource.getRepository(Teacher).save(teacher); return { status: 200, data: teacher }
      }

      if (body.teacherClasses || body.teacherDisciplines) { await this.updateRelation(teacher, body) }

      await AppDataSource.getRepository(Teacher).save(teacher);

      return { status: 200, data: teacher };
    } catch ( error: any ) { return { status: 500, message: error.message } }
  }

  async updateRelation(teacher: Teacher, body: TeacherBody) {

    const tcd = await AppDataSource
    .getRepository(TCDRelation)
    .find({ relations: ["teacher", "classroom", "discipline"], where: { endedAt: IsNull(), teacher: { id: Number(teacher.id) } } });

    const arrOfDiff: TCDRelation[] = [];
    const cBody = body.teacherClasses.map((el: any) => parseInt(el));
    const dBody = body.teacherDisciplines.map((el: any) => parseInt(el) );

    const existingRelations = new Set(tcd.map((relation) => `${relation.classroom.id}-${relation.discipline.id}`));

    const requestedRelations = new Set(cBody.flatMap((classroomId) => dBody.map((disciplineId) => `${classroomId}-${disciplineId}`) ) );

    // Encontrar relações a serem encerradas
    for (let relation of tcd) {
      const relationKey = `${relation.classroom.id}-${relation.discipline.id}`;
      if (!requestedRelations.has(relationKey)) { arrOfDiff.push(relation) }
    }

    // Encerrar relações que estão em arrOfDiff
    for (let relation of arrOfDiff) { await teacherRelationController.updateId(relation.id, { endedAt: new Date() }) }

    // Criar novas relações conforme o corpo da requisição
    for (let classroomId of cBody) {
      for (let disciplineId of dBody) {
        const relationKey = `${classroomId}-${disciplineId}`;
        if (!existingRelations.has(relationKey)) {
          const el = new TCDRelation();
          el.teacher = teacher;
          el.classroom = (await AppDataSource.getRepository(Classroom).findOne({ where: { id: classroomId } })) as Classroom;
          el.discipline = (await AppDataSource.getRepository(Discipline).findOne({ where: { id: disciplineId } })) as Discipline;
          el.startedAt = new Date();
          await teacherRelationController.save(el, {});
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
          .getRepository(TCDRelation)
          .findOne({ where: { teacher: { id: teacher.id }, classroom: { id: classroom.id }, discipline: { id: discipline.id }, endedAt: IsNull() } });

        if (!relationExists) {
          const el = new TCDRelation();
          el.teacher = teacher; el.classroom = classroom; el.discipline = discipline; el.startedAt = new Date();
          await teacherRelationController.save(el, {});
        }
      }
    }
  }

  async saveTeacher(body: TeacherBody) {
    try {
      const teacherUserFromFront = (await this.teacherByUser(body.user.user)) as Teacher;

      const message = "Você não tem permissão para criar uma pessoa com esta categoria."
      if (!this.canChange(teacherUserFromFront.person.category.id, body.category.id)) { return { status: 403, message }}

      return await AppDataSource.transaction(async (transaction) => {
        const registerExists = await transaction.findOne(Teacher, { where: { register: body.register } });

        const message = "Já existe um registro com este número de matrícula."
        if (registerExists) { return { status: 409,  message } }

        const emailExists = await transaction.findOne(Teacher, {where: { email: body.email }});
        if (emailExists) {return {status: 409,message: "Já existe um registro com este email."}}

        const category = (await transaction.findOne(PersonCategory, {where: { id: body.category.id }})) as PersonCategory;

        const person = this.createPerson({name: body.name,birth: body.birth,category});

        const teacher = await transaction.save(Teacher, this.createTeacher(teacherUserFromFront.person.user.id, person, body));

        const { username, password, email } = this.generateUser(body);
        await transaction.save(User, { person, username, email, password });

        if (body.category.id === pc.ADMN || body.category.id === pc.SUPE ) { return { status: 201, data: teacher } }

        const classrooms = await transaction.findBy(Classroom, {id: In(body.teacherClasses) });
        const disciplines = await transaction.findBy(Discipline, { id: In(body.teacherDisciplines) });

        for (const classroom of classrooms) {
          for (const discipline of disciplines) {
            const el = new TCDRelation();
            el.teacher = teacher;
            el.classroom = classroom;
            el.discipline = discipline;
            el.startedAt = new Date();
            await transaction.save(el);
          }
        }

        await credentialsEmail(body.email, password, true).catch((e) => console.log(e) );
        return { status: 201, data: teacher };
      });
    } catch (error: any) { return { status: 500, message: error.message } }
  }

  createTeacher(userId: number, person: Person, body: TeacherBody) {
    const teacher = new Teacher();

    teacher.createdByUser = userId;
    teacher.createdAt = new Date();
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
    const lowerLetters = "abcdefghijklmnopqrstuvwxyz";
    const upperLetters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const numbers = "0123456789";
    const allChar = lowerLetters + upperLetters + numbers;

    let password = "";
    for (let i = 0; i < 8; i++) { const randomI = Math.floor(Math.random() * allChar.length); password += allChar[randomI] }
    return password;
  }

  private canChange( uCategory: number, tCategory: number ): boolean {

    const allowedCat = [pc.PROF, pc.MONI, pc.SECR, pc.COOR, pc.VICE, pc.DIRE, pc.SUPE, pc.ADMN ];

    let canPost = allowedCat.includes(tCategory);

    if (uCategory === pc.SECR) { canPost = canPost && [pc.PROF, pc.MONI].includes(tCategory) }
    else if (uCategory === pc.COOR) { canPost = canPost && [pc.PROF, pc.MONI, pc.SECR].includes(tCategory ) }
    else if (uCategory === pc.VICE) { canPost = canPost && [ pc.PROF, pc.MONI, pc.SECR, pc.COOR].includes(tCategory) }
    else if (uCategory === pc.DIRE) { canPost = canPost && [ pc.PROF, pc.MONI, pc.SECR, pc.COOR, pc.VICE ].includes(tCategory) }
    else if (uCategory === pc.SUPE) { canPost = canPost && [ pc.PROF, pc.MONI, pc.SECR, pc.COOR, pc.VICE, pc.DIRE].includes(tCategory) }
    return canPost;
  }
}

export const teacherController = new TeacherController();

import { AppDataSource } from "../data-source";
import { GenericController } from "./genericController";
import { Brackets, EntityManager, EntityTarget, In, IsNull } from "typeorm";
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
import { generatePassword } from "../utils/generatePassword";

import { dbConn } from "../services/db";

class TeacherController extends GenericController<EntityTarget<Teacher>> {

  constructor() { super(Teacher) }

  async teacherForm(req: Request) {

    try {

      return await AppDataSource.transaction(async (CONN) => {

        let disciplines = (await discController.getAllDisciplines(req, CONN)).data;
        let classrooms = (await classroomController.getAllClassrooms(req, true, CONN)).data;
        let personCategories = (await pCatCtrl.findAllPerCat(req, CONN)).data;

        return { status: 200, data: { disciplines, classrooms, personCategories } }
      })
    } catch (error: any) { return { status: 500, message: error.message } }
  }

  async findAllWhereTeacher(request: Request ) {

    const search = request?.query.search ?? "";
    const body = request?.body as TeacherBody;

    let sqlConnection = await dbConn()

    try {

      return await AppDataSource.transaction(async(CONN)=> {

        const qUserTeacher = await this.qTeacherByUser(sqlConnection, body.user.user)
        const qTeacherClasses = await this.qTeacherClassrooms(sqlConnection, body.user.user)

        const notInCategories = [pc.ADMN, pc.SUPE, pc.FORM];

        const newResult = await CONN.getRepository(Teacher)
          .createQueryBuilder("teacher")
          .leftJoinAndSelect("teacher.person", "person")
          .leftJoinAndSelect("person.category", "category")
          .leftJoin("teacher.teacherClassDiscipline", "teacherClassDiscipline")
          .leftJoin("teacherClassDiscipline.classroom", "classroom")
          .where(
            new Brackets((qb) => {
              if (qUserTeacher.person.category.id === pc.PROF || qUserTeacher.person.category.id === pc.MONI) { qb.where("teacher.id = :teacherId", { teacherId: qUserTeacher.id }); return }
              if (qUserTeacher.person.category.id != pc.ADMN && qUserTeacher.person.category.id != pc.SUPE && qUserTeacher.person.category.id != pc.FORM) {
                qb.where("category.id NOT IN (:...categoryIds)", { categoryIds: notInCategories })
                  .andWhere("classroom.id IN (:...classroomIds)", { classroomIds: qTeacherClasses.classrooms })
                  .andWhere("teacherClassDiscipline.endedAt IS NULL");
                return;
              }
            }),
          )
          .andWhere("person.name LIKE :search", { search: `%${search}%` })
          .groupBy("teacher.id")
          .addOrderBy('category.id', 'DESC')
          .addOrderBy('person.name', 'ASC')
          .getMany();

        return { status: 200, data: newResult };
      })
    }
    catch (error: any) { return { status: 500, message: error.message } }
    finally { if(sqlConnection) { sqlConnection.release() } }
  }

  async findOneTeacher(id: string | number, request?: Request) {

    const body = request?.body as TeacherBody;

    let sqlConnection = await dbConn()

    try {
      return await AppDataSource.transaction(async(CONN) => {

        const qUserTeacher = await this.qTeacherByUser(sqlConnection, body.user.user)
        const cannotChange = [pc.MONI, pc.PROF];

        if ( qUserTeacher.id !== Number(id) && cannotChange.includes(qUserTeacher.person.category.id) ) { return { status: 403, message: "Você não tem permissão para visualizar este registro." } }

        const el = await CONN.getRepository(Teacher)
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

        if (!el.teacher_id) { return { status: 404, message: "Dado não encontrado" } }

        let newResult = {
          id: el.teacher_id,
          email: el.teacher_email,
          register: el.teacher_register,
          person: { id: el.person_id, name: el.person_name, birth: el.person_birth, category: { id: el.category_id, name: el.category_name } },
          teacherClasses:el.classroom_ids?.split(",").map((item: string) => parseInt(item)) ?? [],
          teacherDisciplines:el.discipline_ids?.split(",").map((item: string) => parseInt(item)) ?? []
        } as TeacherResponse;

        return { status: 200, data: newResult };
      })
    }
    catch (error: any) { return { status: 500, message: error.message } }
    finally { if(sqlConnection) { sqlConnection.release() } }
  }

  async getRequestedStudentTransfers(req?: Request) {

    let sqlConnection = await dbConn()

    try {
      return await AppDataSource.transaction(async(CONN) => {

        const teacherClasses = await this.qTeacherClassrooms(sqlConnection, req?.body.user.user)

        const studentClassrooms = await CONN.getRepository(StudentClassroom)
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
      })
    }
    catch (error: any) { return { status: 500, message: error.message } }
    finally { if(sqlConnection) { sqlConnection.release() } }
  }

  async updateTeacher(id: string, body: TeacherBody) {
    try {
      return await AppDataSource.transaction(async(CONN) => {
        const uTeacher = await this.teacherByUser(body.user.user, CONN)

        const teacher = await CONN.findOne(Teacher,{ relations: ["person.category", "person.user"], where: { id: Number(id) }})

        if (!teacher) { return { status: 404, message: "Data not found" } }

        const message = "Você não tem permissão para editar as informações selecionadas. Solicite a alguém com cargo superior ao seu."
        if (!this.canChange(uTeacher.person.category.id, teacher.person.category.id)) { return { status: 403, message }}

        if (uTeacher.person.category.id === pc.PROF || (uTeacher.person.category.id === pc.MONI && uTeacher.id !== teacher.id)) {
          return { status: 403, message: "Você não tem permissão para editar este registro." };
        }

        teacher.person.name = body.name;
        teacher.person.birth = body.birth;
        teacher.updatedAt = new Date();
        teacher.updatedByUser = uTeacher.person.user.id

        if(teacher.email != body.email) {

          const emailExists = await CONN.findOne(Teacher, {where: { email: body.email }});
          if (emailExists) { return { status: 409,message: "Já existe um registro com este email." } }

          teacher.email = body.email

          const { password, hashedPassword } = generatePassword()

          const user = {
            id: teacher.person.user.id,
            username: body.email,
            email: body.email,
            password: hashedPassword
          }

          await CONN.save(User, user)

          await credentialsEmail(body.email, password, true).catch((e) => console.log(e) );
        }

        if ( teacher.person.category.id === pc.ADMN || teacher.person.category.id === pc.SUPE || teacher.person.category.id === pc.FORM ) {
          await CONN.save(Teacher, teacher); return { status: 200, data: teacher }
        }

        if (body.teacherClasses || body.teacherDisciplines) { await this.updateRelation(teacher, body, CONN) }

        await CONN.save(Teacher, teacher);

        return { status: 200, data: teacher };
      })
    } catch ( error: any ) { return { status: 500, message: error.message } }
  }

  async updateRelation(teacher: Teacher, body: TeacherBody, CONN: EntityManager) {

    const tcd = await CONN.getRepository(TCDRelation)
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
    for (let relation of arrOfDiff) { await teacherRelationController.updateId(relation.id, { endedAt: new Date() }, CONN) }

    // Criar novas relações conforme o corpo da requisição
    for (let classroomId of cBody) {
      for (let disciplineId of dBody) {
        const relationKey = `${classroomId}-${disciplineId}`;
        if (!existingRelations.has(relationKey)) {
          const el = new TCDRelation();
          el.teacher = teacher;
          el.classroom = (await CONN.getRepository(Classroom).findOne({ where: { id: classroomId } })) as Classroom;
          el.discipline = (await CONN.getRepository(Discipline).findOne({ where: { id: disciplineId } })) as Discipline;
          el.startedAt = new Date();
          await teacherRelationController.save(el, {}, CONN);
        }
      }
    }
  }

  async saveTeacher(body: TeacherBody) {

    let sqlConnection = await dbConn()

    try {
      return await AppDataSource.transaction(async (CONN) => {

        const qUserTeacher = await this.qTeacherByUser(sqlConnection, body.user.user)

        const canChangeErr = "Você não tem permissão para criar uma pessoa com esta categoria."
        if (!this.canChange(qUserTeacher.person.category.id, body.category.id)) { return { status: 403, message: canChangeErr }}

        const registerExists = await CONN.findOne(Teacher, { where: { register: body.register } });

        const message = "Já existe um registro com este número de matrícula."
        if (registerExists) { return { status: 409,  message } }

        const emailExists = await CONN.findOne(Teacher, {where: { email: body.email }});
        if (emailExists) {return {status: 409,message: "Já existe um registro com este email."}}

        const category = (await CONN.findOne(PersonCategory, {where: { id: body.category.id }})) as PersonCategory;

        const person = this.createPerson({ name: body.name.toUpperCase().trim(), birth: body.birth,category });

        const teacher = await CONN.save(Teacher, this.createTeacher(qUserTeacher.person.user.id, person, body));

        const { username, passwordObject, email } = this.generateUser(body);

        await CONN.save(User, { person, username, email, password: passwordObject.hashedPassword });

        if (body.category.id === pc.ADMN || body.category.id === pc.SUPE || body.category.id === pc.FORM ) {
          await credentialsEmail(body.email, passwordObject.password, true).catch((e) => console.log(e) );
          return { status: 201, data: teacher }
        }

        const classrooms = await CONN.findBy(Classroom, {id: In(body.teacherClasses) });
        const disciplines = await CONN.findBy(Discipline, { id: In(body.teacherDisciplines) });

        for (const classroom of classrooms) {
          for (const discipline of disciplines) {
            const el = new TCDRelation();
            el.teacher = teacher;
            el.classroom = classroom;
            el.discipline = discipline;
            el.startedAt = new Date();
            await CONN.save(el);
          }
        }

        await credentialsEmail(body.email, passwordObject.password, true).catch((e) => console.log(e) );
        return { status: 201, data: teacher };
      });
    }
    catch (error: any) { return { status: 500, message: error.message } }
    finally { if(sqlConnection) { sqlConnection.release() } }
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
    const passwordObject = generatePassword()

    return { username, passwordObject, email };
  }

  private canChange( uCategory: number, tCategory: number ): boolean {

    const allowedCat = [pc.PROF, pc.MONI, pc.SECR, pc.COOR, pc.VICE, pc.DIRE, pc.FORM, pc.SUPE, pc.ADMN,  ];

    let canPost = allowedCat.includes(tCategory);

    if (uCategory === pc.SECR) { canPost = canPost && [pc.PROF, pc.MONI].includes(tCategory) }
    else if (uCategory === pc.COOR) { canPost = canPost && [pc.PROF, pc.MONI, pc.SECR].includes(tCategory ) }
    else if (uCategory === pc.VICE) { canPost = canPost && [ pc.PROF, pc.MONI, pc.SECR, pc.COOR].includes(tCategory) }
    else if (uCategory === pc.DIRE) { canPost = canPost && [ pc.PROF, pc.MONI, pc.SECR, pc.COOR, pc.VICE ].includes(tCategory) }
    else if (uCategory === pc.SUPE) { canPost = canPost && [ pc.PROF, pc.MONI, pc.SECR, pc.COOR, pc.VICE, pc.DIRE, pc.FORM].includes(tCategory) }
    else if (uCategory === pc.ADMN) { canPost = canPost && [ pc.PROF, pc.MONI, pc.SECR, pc.COOR, pc.VICE, pc.DIRE, pc.FORM, pc.SUPE].includes(tCategory) }
    return canPost;
  }
}

export const teacherController = new TeacherController();

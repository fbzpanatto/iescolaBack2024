import { AppDataSource } from "../data-source";
import { GenericController } from "./genericController";
import { Brackets, EntityManager, EntityTarget } from "typeorm";
import { PersonCategory } from "../model/PersonCategory";
import { Teacher } from "../model/Teacher";
import { Person } from "../model/Person";
import { TeacherBody } from "../interfaces/interfaces";
import { TeacherClassDiscipline} from "../model/TeacherClassDiscipline";
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
import { PoolConnection } from "mysql2/promise";
import {School} from "../model/School";
import {Discipline} from "../model/Discipline";
import {Classroom} from "../model/Classroom";

class TeacherController extends GenericController<EntityTarget<Teacher>> {

  constructor() { super(Teacher) }

  async teacherForm(req: Request) {

    try {

      return await AppDataSource.transaction(async (CONN) => {

        let disciplines = (await discController.getAllDisciplines(req, CONN)).data;
        let classrooms = (await classroomController.getAllClassrooms(req, true, CONN)).data;
        let personCategories = (await pCatCtrl.findAllPerCat(req, CONN)).data;
        let schools = await CONN.getRepository(School).find();

        return { status: 200, data: { disciplines, classrooms, personCategories, schools } }
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
      const qUserTeacher = await this.qTeacherByUser(sqlConnection, body.user.user)
      const cannotChange = [pc.MONI, pc.PROF];

      if ( qUserTeacher.id !== Number(id) && cannotChange.includes(qUserTeacher.person.category.id) ) { return { status: 403, message: "Você não tem permissão para visualizar este registro." } }

      const qTeacher = await this.qTeacherRelationship(sqlConnection, id)

      if (!qTeacher.id) { return { status: 404, message: "Dado não encontrado" } }

      return { status: 200, data: qTeacher };
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

    let sqlConnection = await dbConn()

    try {
      return await AppDataSource.transaction(async(CONN) => {

        const qUserTeacher = await this.qTeacherByUser(sqlConnection, body.user.user)

        const teacher = await CONN.findOne(Teacher,{ relations: ["person.category", "person.user", "school"], where: { id: Number(id) }})

        if (!teacher) { return { status: 404, message: "Data not found" } }

        const message = "Você não tem permissão para editar as informações selecionadas. Solicite a alguém com cargo superior ao seu."
        if (!this.canChange(qUserTeacher.person.category.id, teacher.person.category.id)) { return { status: 403, message }}

        if (qUserTeacher.person.category.id === pc.PROF || (qUserTeacher.person.category.id === pc.MONI && qUserTeacher.id !== teacher.id)) {
          return { status: 403, message: "Você não tem permissão para editar este registro." };
        }

        teacher.person.name = body.name;
        teacher.person.birth = body.birth;
        teacher.updatedAt = new Date();
        teacher.updatedByUser = qUserTeacher.person.user.id;
        teacher.observation = body.observation;

        if (teacher.person.category.id != pc.ADMN && teacher.person.category.id != pc.SUPE && teacher.person.category.id != pc.FORM && teacher.school === null) {

          teacher.school = { id: Number(body.school) } as School
        }

        if(teacher.email != body.email) {

          const emailExists = await CONN.findOne(Teacher, {where: { email: body.email }});
          if (emailExists) { return { status: 409,message: "Já existe um registro com este email." } }

          teacher.email = body.email

          const { password, hashedPassword } = generatePassword()

          const user = { id: teacher.person.user.id, username: body.email, email: body.email, password: hashedPassword }

          await CONN.save(User, user)

          await credentialsEmail(body.email, password, true).catch((e) => console.log(e) );
        }

        const methods = this.methods(teacher, CONN, sqlConnection, body)

        return await methods[teacher.person.category.id]()
      })
    }
    catch ( error: any ) {
      console.error( error );
      return { status: 500, message: error.message }
    }
    finally { if(sqlConnection) { sqlConnection.release() } }
  }

  async changeTeacherMasterSchool(body: TeacherBody, teacher: Teacher, sqlConnection: PoolConnection, CONN: EntityManager) {

    if(Number(body.school) != Number(teacher.school.id)) {

      await this.qChangeMasterTeacherSchool(sqlConnection, teacher.id)

      teacher.school = { id: Number(body.school) } as School

      const disciplines = await CONN.find(Discipline)
      const classrooms = await CONN.find(Classroom, { where: { school: { id: Number(body.school) } } })

      for(let discipline of disciplines) {
        for(let classroom of classrooms ) {
          await CONN.getRepository(TeacherClassDiscipline).save({
            teacher: { id: teacher.id },
            discipline: { id: discipline.id },
            classroom: { id: classroom.id },
            startedAt: new Date(),
          })
        }
      }
    }

    await CONN.save(Teacher, teacher); return { status: 200, data: teacher }
  }

  async adminSupeFormUpdateMethod(teacher: Teacher, CONN: EntityManager) {
    await CONN.save(Teacher, teacher); return { status: 200, data: teacher }
  }

  async updateTeacherClassesAndDisciplines(teacher: Teacher, CONN: EntityManager, sqlConnection: PoolConnection, body: TeacherBody) {

    const qDbRelationShip = (await this.qTeacherRelationship(sqlConnection, teacher.id)).teacherClassesDisciplines

    for(let bodyElement of body.teacherClassesDisciplines) {

      const dataBaseRow = qDbRelationShip.find(dataRow => {
        return dataRow.id === bodyElement.id && dataRow.teacherId === bodyElement.teacherId && dataRow.classroomId === bodyElement.classroomId && dataRow.disciplineId === bodyElement.disciplineId
      })

      if(dataBaseRow && !bodyElement.active) { await CONN.getRepository(TeacherClassDiscipline).save({...dataBaseRow, endedAt: new Date()})}

      if(bodyElement.id === null && !dataBaseRow && bodyElement.active && bodyElement.teacherId && bodyElement.disciplineId && bodyElement.classroomId) {
        await CONN.getRepository(TeacherClassDiscipline).save({
          teacher: { id: bodyElement.teacherId },
          discipline: { id: bodyElement.disciplineId },
          classroom: { id: bodyElement.classroomId },
          startedAt: new Date(),
        })
      }
    }

    teacher.school = { id: Number(body.school) } as School
    await CONN.save(Teacher, teacher); return { status: 200, data: teacher }
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

        if(body.category.id === pc.ADMN || body.category.id === pc.SUPE || body.category.id === pc.FORM ) {
          await credentialsEmail(body.email, passwordObject.password, true).catch((e) => console.log(e) );
          return { status: 201, data: teacher }
        }

        if(body.category.id === pc.DIRE || body.category.id === pc .VICE || body.category.id === pc.COOR || body.category.id === pc.SECR || body.category.id === pc.MONI) {

          const disciplines = await CONN.getRepository(Discipline).find()
          const classrooms = await CONN.getRepository(Classroom).find({ where: { school: { id: body.school } } })

          for(let discipline of disciplines) {
            for(let classroom of classrooms) {
              await CONN.save(TeacherClassDiscipline, {
                teacher: teacher,
                classroom: { id: classroom.id },
                discipline: { id: discipline.id },
                startedAt: new Date()
              })
            }
          }

          await credentialsEmail(body.email, passwordObject.password, true).catch((e) => console.log(e))

          return { status: 201, data: teacher }
        }

        if(body.category.id === pc.PROF) {
          for (const rel of body.teacherClassesDisciplines) {
            await CONN.save(TeacherClassDiscipline, {
              teacher: teacher,
              classroom: { id: rel.classroomId },
              discipline: { id: rel.disciplineId },
              startedAt: new Date()
            })
          }

          await credentialsEmail(body.email, passwordObject.password, true).catch((e) => console.log(e))

          return { status: 201, data: teacher }
        }

        await credentialsEmail(body.email, passwordObject.password, true).catch((e) => console.log(e))

        return { status: 201, data: teacher }
      })
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
    teacher.observation = body.observation;

    if(Number(body.school)) { teacher.school = { id: Number(body.school) } as School }

    return teacher;
  }

  generateUser(body: TeacherBody) {
    const username = body.email;
    const email = body.email;
    const passwordObject = generatePassword()

    return { username, passwordObject, email };
  }

  methods(teacher: Teacher, CONN: EntityManager, sqlConnection: PoolConnection, body: TeacherBody) {
    return {
      [pc.ADMN]: async () => await this.adminSupeFormUpdateMethod(teacher, CONN),
      [pc.SUPE]: async () => await this.adminSupeFormUpdateMethod(teacher, CONN),
      [pc.FORM]: async () => await this.adminSupeFormUpdateMethod(teacher, CONN),
      [pc.DIRE]: async () => await this.changeTeacherMasterSchool(body, teacher, sqlConnection, CONN),
      [pc.VICE]: async () => await this.changeTeacherMasterSchool(body, teacher, sqlConnection, CONN),
      [pc.COOR]: async () => await this.changeTeacherMasterSchool(body, teacher, sqlConnection, CONN),
      [pc.SECR]: async () => await this.changeTeacherMasterSchool(body, teacher, sqlConnection, CONN),
      [pc.MONI]: async () => await this.changeTeacherMasterSchool(body, teacher, sqlConnection, CONN),
      [pc.PROF]: async () => await this.updateTeacherClassesAndDisciplines(teacher, CONN, sqlConnection, body)
    }
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

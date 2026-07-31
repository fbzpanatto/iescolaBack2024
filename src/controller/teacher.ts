import { GenericController } from "./genericController";
import { EntityTarget } from "typeorm";
import { Teacher } from "../model/Teacher";
import { TeacherBody, UserInterface, JwtPayload } from "../interfaces/interfaces";
import { Request } from "express";
import {OUT_CLASSROOMS, ROLE_PERMISSIONS, TRANSFER_STATUS} from "../utils/enums";
import { discController } from "./discipline";
import { classroomController } from "./classroom";
import { PER_CAT as pc } from "../utils/enums";
import { pCatCtrl } from "./personCategory";
import { credentialsEmail } from "../services/email";
import { generatePassword } from "../utils/generatePassword";
import { connectionPool } from "../services/db";

class TeacherController extends GenericController<EntityTarget<Teacher>> {

  constructor() { super(Teacher) }

  async teacherForm(req: Request, authUser: JwtPayload) {

    try {

      let disciplines = (await discController.getAllDisciplines(req, authUser)).data;
      let classrooms = (await classroomController.getAllClassrooms(req, authUser)).data;
      let personCategories = (await pCatCtrl.findAllPerCat(req, authUser)).data;
      let schools = await this.qAllSchools();
      let contracts = await this.qContracts();

      classrooms = classrooms?.filter(classroom => !OUT_CLASSROOMS.includes(classroom.id))

      return { status: 200, data: { disciplines, classrooms, personCategories, schools, contracts } }
    } catch (error: any) { return { status: 500, message: error.message } }
  }

  async findAllWhereTeacher(request: Request, authUser: JwtPayload) {
    const search = (request?.query.search as string) ?? "";

    const option = Number(request?.query.option);

    try {
      const qUserTeacher = await this.qTeacherByUser(authUser.user);
      const qTeacherClasses = await this.qTeacherClassrooms(authUser.user);
      let response: {}[] = [];

      if([pc.ADMN].includes(qUserTeacher.person.category.id)) {
        return option === 1 ? { status: 200, data: await this.qAllTeachersForSuperUser(search, true) } : { status: 200, data: [] };
      }

      if([pc.SUPE_EI, pc.SUPE, pc.FORM].includes(qUserTeacher.person.category.id)) {
        return option === 1 ? { status: 200, data: await this.qAllTeachersForSuperUser(search) } : { status: 200, data: [] };
      }

      if(option === 1) {
        response = await this.qTeacherThatBelongs(qTeacherClasses.classrooms, search);
      }

      if(option === 2) {
        response = await this.qTeacherThatNotBelongs(qTeacherClasses.classrooms, pc.PROF, search);
      }

      return { status: 200, data: response };
    }
    catch (error: any) { console.log(error); return { status: 500, message: error.message } }
  }

  async findOneTeacher(id: string | number, request: Request<{ id: string | number }>, authUser: JwtPayload) {

    try {
      const qUserTeacher = await this.qTeacherByUser(authUser.user)
      const qUserTeacherClasses = await this.qTeacherClassrooms(authUser.user)

      const cannotChange = [pc.MONI, pc.PROF];

      if ( qUserTeacher.id !== Number(id) && cannotChange.includes(qUserTeacher.person.category.id) ) { return { status: 403, message: "Você não tem permissão para visualizar este registro." } }

      const qTeacher = await this.qTeacherRelationship(id)
      if (!qTeacher.id) { return { status: 404, message: "Dado não encontrado" } }
      const qTeacherClassrooms = qTeacher.teacherClassesDisciplines.map(el => el.classroomId)

      if(![pc.ADMN, pc.FORM, pc.SUPE, pc.SUPE_EI].includes(qUserTeacher.person.category.id) ) {
        const condition = qUserTeacherClasses.classrooms.some(el => qTeacherClassrooms.includes(el))
        if(!condition) { return { status: 403, message: "Você não tem permissão para visualizar este registro." } }
      }

      return { status: 200, data: qTeacher };
    }
    catch (error: any) { return { status: 500, message: error.message } }
  }

  async getRequestedStudentTransfers(req: Request, authUser: JwtPayload) {
    try {
      const teacherClasses = await this.qTeacherClassrooms(authUser.user)
      const count = await this.qPendingTransferCountByClassrooms(teacherClasses.classrooms, TRANSFER_STATUS.PENDING)

      return { status: 200, data: count }
    }
    catch (error: any) { return { status: 500, message: error.message } }
  }

  async updateTeacher(id: string, body: TeacherBody, authUser: UserInterface) {
    let conn;
    try {
      const qUserTeacher = await this.qTeacherByUser(authUser.user)

      conn = await connectionPool.getConnection();
      await conn.beginTransaction();

      const [ rows ] = await conn.query(
        `
        SELECT
          t.id, t.email, t.register, t.observation, t.schoolId,
          s.name AS school_name, s.shortName AS school_shortName, s.inep AS school_inep, s.active AS school_active,
          p.id AS person_id, p.name AS person_name, p.birth AS person_birth,
          pc.id AS category_id, pc.name AS category_name, pc.active AS category_active,
          u.id AS user_id, u.username AS user_username, u.email AS user_email
        FROM teacher AS t
          INNER JOIN person AS p ON p.id = t.personId
          INNER JOIN person_category AS pc ON pc.id = p.categoryId
          INNER JOIN user AS u ON u.personId = p.id
          LEFT JOIN school AS s ON s.id = t.schoolId
        WHERE t.id = ?
        LIMIT 1
        `,
        [Number(id)]
      );
      const row = (rows as any[])[0];

      if (!row) { await conn.commit(); return { status: 404, message: "Data not found" } }

      const message = "Você não tem permissão para editar as informações selecionadas. Solicite a alguém com cargo superior ao seu."
      if (!this.canChange(qUserTeacher.person.category.id, row.category_id)) { await conn.commit(); return { status: 403, message } }

      if (qUserTeacher.person.category.id === pc.PROF || (qUserTeacher.person.category.id === pc.MONI && qUserTeacher.id !== row.id)) {
        await conn.commit();
        return { status: 403, message: "Você não tem permissão para editar este registro." };
      }

      const teacher: any = {
        id: row.id,
        email: row.email,
        register: body.register,
        observation: body.observation,
        schoolId: row.schoolId,
        school: row.schoolId !== null ? {
          id: row.schoolId, name: row.school_name, shortName: row.school_shortName,
          inep: row.school_inep, active: row.school_active === 1
        } : null,
        person: {
          id: row.person_id,
          name: body.name,
          birth: body.birth,
          category: { id: row.category_id, name: row.category_name, active: row.category_active === 1 },
          user: { id: row.user_id, username: row.user_username, email: row.user_email }
        }
      };

      await conn.query(
        `UPDATE person SET name = ?, birth = ? WHERE id = ?`,
        [body.name, this.toSqlUtcDateTime(body.birth), teacher.person.id]
      );

      teacher.updatedAt = new Date();
      teacher.updatedByUser = qUserTeacher.person.user.id;

      await conn.query(
        `UPDATE teacher SET register = ?, observation = ?, updatedAt = ?, updatedByUser = ? WHERE id = ?`,
        [body.register, body.observation, this.toSqlUtcDateTime(teacher.updatedAt), teacher.updatedByUser, teacher.id]
      );

      if (teacher.person.category.id != pc.ADMN && teacher.person.category.id != pc.SUPE && teacher.person.category.id != pc.SUPE_EI && teacher.person.category.id != pc.FORM && row.schoolId === null) {

        teacher.school = { id: Number(body.school) }
        await conn.query(`UPDATE teacher SET schoolId = ? WHERE id = ?`, [Number(body.school), teacher.id]);
      }

      if (teacher.email != body.email) {

        const [ emailRows ] = await conn.query(`SELECT id FROM teacher WHERE email = ? LIMIT 1`, [body.email]);
        if ((emailRows as any[])[0]) { await conn.commit(); return { status: 409, message: "Já existe um registro com este email." } }

        teacher.email = body.email

        const { password, hashedPassword } = await generatePassword()

        await conn.query(`UPDATE teacher SET email = ? WHERE id = ?`, [body.email, teacher.id]);
        await conn.query(`UPDATE user SET username = ?, email = ?, password = ? WHERE id = ?`, [body.email, body.email, hashedPassword, teacher.person.user.id]);

        await credentialsEmail(body.email, password, true).catch((e) => console.log(e) );
      }

      const methods = this.methods(teacher, conn, body)

      const result = await methods[row.category_id]()

      await conn.commit();
      return result;
    }
    catch ( error: any ) { if (conn) await conn.rollback(); console.error( error ); return { status: 500, message: error.message } }
    finally { if (conn) { conn.release() } }
  }

  async updateTeacherSingleRel(id: string, body: { teacher: {  id: number }, classroom: { id: number }, discipline: { id: number }}, authUser: UserInterface) {
    try {
      const [qUserTeacher, classroom, discipline, teacher] = await Promise.all([
        this.qTeacherByUser(authUser.user),
        this.qClassroom(body.classroom.id),
        this.qDiscipline(body.discipline.id),
        this.qTeacher(body.teacher.id)
      ])

      if(qUserTeacher && classroom && discipline && teacher) { await this.qSingleRel(body.teacher.id, body.classroom.id, body.discipline.id) }

      return { status: 200, data: { message: 'done.' } }
    }
    catch ( error: any ) { console.error( error ); return { status: 500, message: error.message } }
  }

  async adminSupeFormUpdateMethod(teacher: any, conn: any) {
    return { status: 200, data: this.buildTeacherResponse(teacher) }
  }

  async changeTeacherMasterSchool(body: TeacherBody, teacher: any, conn: any) {

    const targetCategory = Number(body.category);

    const MASTER_ROLES = [
      Number(pc.DIRE),
      Number(pc.VICE),
      Number(pc.COOR)
    ];

    const isTargetMaster = MASTER_ROLES.includes(targetCategory);
    const isTargetProfessor = targetCategory === Number(pc.PROF);

    if (isTargetMaster) {

      teacher.person.category = { id: targetCategory };
      teacher.school = { id: Number(body.school) };

      await conn.query(`UPDATE person SET categoryId = ? WHERE id = ?`, [targetCategory, teacher.person.id]);
      await conn.query(`UPDATE teacher SET schoolId = ? WHERE id = ?`, [Number(body.school), teacher.id]);

      await this.qEndAllTeacherRelations(teacher.id);

      const [ disciplineRows ] = await conn.query(`SELECT id FROM discipline`);
      const [ classroomRows ] = await conn.query(`SELECT id FROM classroom WHERE schoolId = ?`, [Number(body.school)]);

      const startedAt = this.toSqlUtcDateTime(new Date());
      const masterRelations: any[] = [];

      for (const discipline of disciplineRows as any[]) {
        for (const classroom of classroomRows as any[]) {
          masterRelations.push([teacher.id, classroom.id, discipline.id, startedAt, null]);
        }
      }

      if (masterRelations.length > 0) {
        await conn.query(
          `INSERT INTO teacher_class_discipline (teacherId, classroomId, disciplineId, startedAt, contractId) VALUES ?`,
          [masterRelations]
        );
      }
    }
    else if (isTargetProfessor) {

      teacher.person.category = { id: targetCategory };
      await conn.query(`UPDATE person SET categoryId = ? WHERE id = ?`, [targetCategory, teacher.person.id]);

      await this.qEndAllTeacherRelations(teacher.id);

      await this.updateTeacherClassesAndDisciplines(teacher, conn, body);
    }

    return { status: 200, data: this.buildTeacherResponse(teacher) };
  }

  async updateTeacherClassesAndDisciplines(teacher: any, conn: any, body: TeacherBody) {

    const targetCategory = Number(body.category);
    const currentCategory = Number(teacher.person.category.id);

    const MASTER_ROLES = [
      Number(pc.DIRE),
      Number(pc.VICE),
      Number(pc.COOR)
    ];

    const isBecomingMaster = MASTER_ROLES.includes(targetCategory) && targetCategory !== currentCategory;
    const isDemotingToTeacher = targetCategory === Number(pc.PROF) && MASTER_ROLES.includes(currentCategory);

    if (isBecomingMaster || isDemotingToTeacher) { return await this.changeTeacherMasterSchool(body, teacher, conn) }

    const qDbRelationShip = (await this.qTeacherRelationship(teacher.id)).teacherClassesDisciplines;

    const toEnd: number[] = [];
    const toReactivate: { id: number, contractId: number | null }[] = [];
    const toCreate: { teacherId: number, classroomId: number, disciplineId: number, contractId: number | null }[] = [];

    for (const bodyElement of body.teacherClassesDisciplines) {

      const dataBaseRow = qDbRelationShip.find(dataRow =>
        dataRow.id === bodyElement.id &&
        dataRow.teacherId === bodyElement.teacherId &&
        dataRow.classroomId === bodyElement.classroomId &&
        dataRow.disciplineId === bodyElement.disciplineId
      );

      const hasValidData = bodyElement.teacherId && bodyElement.disciplineId && bodyElement.classroomId;
      const hasValidContract = bodyElement.contract && (bodyElement.contract === 1 || bodyElement.contract === 2);

      if (dataBaseRow && !bodyElement.active) {
        toEnd.push(dataBaseRow.id);
        continue;
      }

      if (bodyElement.id && bodyElement.active && hasValidData && dataBaseRow) {
        toReactivate.push({ id: dataBaseRow.id, contractId: hasValidContract ? (bodyElement.contract as number) : null });
        continue;
      }

      if (bodyElement.id === null && !dataBaseRow && bodyElement.active && hasValidData) {
        toCreate.push({
          teacherId: bodyElement.teacherId,
          classroomId: bodyElement.classroomId,
          disciplineId: bodyElement.disciplineId,
          contractId: hasValidContract ? (bodyElement.contract as number) : null
        });
      }
    }

    const now = this.toSqlUtcDateTime(new Date());

    if (toEnd.length > 0) {
      await conn.query(`UPDATE teacher_class_discipline SET endedAt = ? WHERE id IN (?)`, [now, toEnd]);
    }

    for (const item of toReactivate) {
      if (item.contractId !== null) {
        await conn.query(`UPDATE teacher_class_discipline SET endedAt = NULL, contractId = ? WHERE id = ?`, [item.contractId, item.id]);
      } else {
        await conn.query(`UPDATE teacher_class_discipline SET endedAt = NULL WHERE id = ?`, [item.id]);
      }
    }

    if (toCreate.length > 0) {
      const values = toCreate.map(item => [item.teacherId, item.classroomId, item.disciplineId, now, item.contractId]);
      await conn.query(`INSERT INTO teacher_class_discipline (teacherId, classroomId, disciplineId, startedAt, contractId) VALUES ?`, [values]);
    }

    if (Number(body.school) !== Number(teacher.school.id)) {
      teacher.school = { id: Number(body.school) };
      await conn.query(`UPDATE teacher SET schoolId = ? WHERE id = ?`, [Number(body.school), teacher.id]);
    }

    return { status: 200, data: this.buildTeacherResponse(teacher) };
  }

  private buildTeacherResponse(teacher: any) {
    return {
      id: teacher.id,
      email: teacher.email,
      register: teacher.register,
      observation: teacher.observation,
      updatedAt: teacher.updatedAt,
      updatedByUser: teacher.updatedByUser,
      school: teacher.school,
      person: {
        id: teacher.person.id,
        name: teacher.person.name,
        birth: teacher.person.birth,
        category: teacher.person.category,
        user: { id: teacher.person.user.id, username: teacher.person.user.username, email: teacher.person.user.email }
      }
    };
  }

  async saveTeacher(body: TeacherBody, authUser: UserInterface) {
    try {
      const qUserTeacher = await this.qTeacherByUser(authUser.user)

      const canChangeErr = "Você não tem permissão para criar uma pessoa com esta categoria."
      if (!this.canChange(qUserTeacher.person.category.id, body.category.id)) { return { status: 403, message: canChangeErr }}

      const { username, passwordObject, email } = await this.generateUser(body);

      const result = await this.qCreateTeacher(body, qUserTeacher.person.user.id, username, email, passwordObject.hashedPassword);

      if (result.outcome === 'register_exists') { return { status: 409, message: "Já existe um registro com este número de matrícula." } }
      if (result.outcome === 'email_exists') { return { status: 409, message: "Já existe um registro com este email." } }

      await credentialsEmail(body.email, passwordObject.password, true).catch((e) => console.log(e));

      return { status: 201, data: result.data };
    }
    catch (error: any) { return { status: 500, message: error.message } }
  }

  async generateUser(body: TeacherBody) {
    const username = body.email;
    const email = body.email;
    const passwordObject = await generatePassword()

    return { username, passwordObject, email };
  }

  methods(teacher: any, conn: any, body: TeacherBody) {
    return {
      [pc.ADMN]: async () => await this.adminSupeFormUpdateMethod(teacher, conn),
      [pc.SUPE]: async () => await this.adminSupeFormUpdateMethod(teacher, conn),
      [pc.SUPE_EI]: async () => await this.adminSupeFormUpdateMethod(teacher, conn),
      [pc.FORM]: async () => await this.adminSupeFormUpdateMethod(teacher, conn),
      [pc.DIRE]: async () => await this.changeTeacherMasterSchool(body, teacher, conn),
      [pc.VICE]: async () => await this.changeTeacherMasterSchool(body, teacher, conn),
      [pc.COOR]: async () => await this.changeTeacherMasterSchool(body, teacher, conn),
      [pc.SECR]: async () => await this.changeTeacherMasterSchool(body, teacher, conn),
      [pc.MONI]: async () => await this.changeTeacherMasterSchool(body, teacher, conn),
      [pc.PROF]: async () => await this.updateTeacherClassesAndDisciplines(teacher, conn, body)
    }
  }

  private canChange(uCategory: number, tCategory: number): boolean {
    const allowedTargets = ROLE_PERMISSIONS[uCategory];
    return allowedTargets ? allowedTargets.includes(tCategory) : false;
  }
}

export const teacherController = new TeacherController();

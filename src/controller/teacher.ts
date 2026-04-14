import { AppDataSource } from "../data-source";
import { GenericController } from "./genericController";
import { EntityManager, EntityTarget } from "typeorm";
import { PersonCategory } from "../model/PersonCategory";
import { Teacher } from "../model/Teacher";
import { Person } from "../model/Person";
import { TeacherBody, UserInterface } from "../interfaces/interfaces";
import { TeacherClassDiscipline} from "../model/TeacherClassDiscipline";
import { Request } from "express";
import { User } from "../model/User";
import { StudentClassroom } from "../model/StudentClassroom";
import {OUT_CLASSROOMS, ROLE_PERMISSIONS, TRANSFER_STATUS} from "../utils/enums";
import { discController } from "./discipline";
import { classroomController } from "./classroom";
import { PER_CAT as pc } from "../utils/enums";
import { pCatCtrl } from "./personCategory";
import { credentialsEmail } from "../services/email";
import { generatePassword } from "../utils/generatePassword";
import { School} from "../model/School";
import { Discipline } from "../model/Discipline";
import { Classroom } from "../model/Classroom";
import { Contract } from "../model/Contract";

class TeacherController extends GenericController<EntityTarget<Teacher>> {

  constructor() { super(Teacher) }

  async teacherForm(req: Request) {

    try {

      return await AppDataSource.transaction(async (CONN) => {

        let disciplines = (await discController.getAllDisciplines(req)).data;
        let classrooms = (await classroomController.getAllClassrooms(req)).data;
        let personCategories = (await pCatCtrl.findAllPerCat(req)).data;
        let schools = await CONN.getRepository(School).find();
        let contracts = await CONN.getRepository(Contract).find();

        classrooms = classrooms?.filter(classroom => !OUT_CLASSROOMS.includes(classroom.id))

        return { status: 200, data: { disciplines, classrooms, personCategories, schools, contracts } }
      })
    } catch (error: any) { return { status: 500, message: error.message } }
  }

  async findAllWhereTeacher(request: Request ) {
    const search = (request?.query.search as string) ?? "";

    const body = request?.body as TeacherBody;
    const option = Number(request?.query.option);

    try {
      const qUserTeacher = await this.qTeacherByUser(body.user.user);
      const qTeacherClasses = await this.qTeacherClassrooms(body.user.user);
      let response: {}[] = [];

      if([pc.ADMN].includes(qUserTeacher.person.category.id)) {
        return option === 1 ? { status: 200, data: await this.qAllTeachersForSuperUser(search, true) } : { status: 200, data: [] };
      }

      if([pc.SUPE, pc.FORM].includes(qUserTeacher.person.category.id)) {
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

  async findOneTeacher(id: string | number, request?: Request<{ id: string | number }>) {

    const body = request?.body as TeacherBody;

    try {
      const qUserTeacher = await this.qTeacherByUser(body.user.user)
      const qUserTeacherClasses = await this.qTeacherClassrooms(body.user.user)

      const cannotChange = [pc.MONI, pc.PROF];

      if ( qUserTeacher.id !== Number(id) && cannotChange.includes(qUserTeacher.person.category.id) ) { return { status: 403, message: "Você não tem permissão para visualizar este registro." } }

      const qTeacher = await this.qTeacherRelationship(id)
      if (!qTeacher.id) { return { status: 404, message: "Dado não encontrado" } }
      const qTeacherClassrooms = qTeacher.teacherClassesDisciplines.map(el => el.classroomId)

      if(![pc.ADMN, pc.FORM, pc.SUPE].includes(qUserTeacher.person.category.id) ) {
        const condition = qUserTeacherClasses.classrooms.some(el => qTeacherClassrooms.includes(el))
        if(!condition) { return { status: 403, message: "Você não tem permissão para visualizar este registro." } }
      }

      return { status: 200, data: qTeacher };
    }
    catch (error: any) { return { status: 500, message: error.message } }
  }

  async getRequestedStudentTransfers(req?: Request) {
    try {
      return await AppDataSource.transaction(async(CONN) => {

        const teacherClasses = await this.qTeacherClassrooms(req?.body.user.user)

        const studentClassrooms = await CONN.getRepository(StudentClassroom)
          .createQueryBuilder("studentClassroom")
          .leftJoin("studentClassroom.classroom", "classroom")
          .leftJoin("studentClassroom.student", "student")
          .leftJoin("student.person", "person")
          .leftJoin("student.transfers", "transfers")
          .where("classroom.id IN (:...ids)", { ids: teacherClasses.classrooms })
          .andWhere("studentClassroom.endedAt IS NULL")
          .andWhere("transfers.endedAt IS NULL")
          .andWhere("transfers.status = :status", { status: TRANSFER_STATUS.PENDING })
          .getCount()

        return { status: 200, data: studentClassrooms }
      })
    }
    catch (error: any) { return { status: 500, message: error.message } }
  }

  async updateTeacher(id: string, body: TeacherBody) {
    try {
      return await AppDataSource.transaction(async(CONN) => {

        const qUserTeacher = await this.qTeacherByUser(body.user.user)

        const teacher = await CONN.findOne(Teacher,{ relations: ["person.category", "person.user", "school"], where: { id: Number(id) }})

        if (!teacher) { return { status: 404, message: "Data not found" } }

        const message = "Você não tem permissão para editar as informações selecionadas. Solicite a alguém com cargo superior ao seu."
        if (!this.canChange(qUserTeacher.person.category.id, teacher.person.category.id)) { return { status: 403, message }}

        if (qUserTeacher.person.category.id === pc.PROF || (qUserTeacher.person.category.id === pc.MONI && qUserTeacher.id !== teacher.id)) {
          return { status: 403, message: "Você não tem permissão para editar este registro." };
        }

        teacher.person.name = body.name;
        teacher.person.birth = body.birth;
        teacher.register = body.register;
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

          const { password, hashedPassword } = await generatePassword()

          const user = { id: teacher.person.user.id, username: body.email, email: body.email, password: hashedPassword }

          await CONN.save(User, user)

          await credentialsEmail(body.email, password, true).catch((e) => console.log(e) );
        }

        const methods = this.methods(teacher, CONN, body)

        return await methods[teacher.person.category.id]()
      })
    }
    catch ( error: any ) { console.error( error ); return { status: 500, message: error.message } }
  }

  async updateTeacherSingleRel(id: string, body: { user: UserInterface, teacher: {  id: number }, classroom: { id: number }, discipline: { id: number }}) {
    try {
      const [qUserTeacher, classroom, discipline, teacher] = await Promise.all([
        this.qTeacherByUser(body.user.user),
        this.qClassroom(body.classroom.id),
        this.qDiscipline(body.discipline.id),
        this.qTeacher(body.teacher.id)
      ])

      if(qUserTeacher && classroom && discipline && teacher) { await this.qSingleRel(body.teacher.id, body.classroom.id, body.discipline.id) }

      return { status: 200, data: { message: 'done.' } }
    }
    catch ( error: any ) { console.error( error ); return { status: 500, message: error.message } }
  }

  async adminSupeFormUpdateMethod(teacher: Teacher, CONN: EntityManager) {
    await CONN.save(Teacher, teacher); return { status: 200, data: teacher }
  }

  async changeTeacherMasterSchool(body: TeacherBody, teacher: Teacher, CONN: EntityManager) {

    const targetCategory = Number(body.category);

    const MASTER_ROLES = [
      Number(pc.DIRE),
      Number(pc.VICE),
      Number(pc.COOR)
    ];

    const isTargetMaster = MASTER_ROLES.includes(targetCategory);
    const isTargetProfessor = targetCategory === Number(pc.PROF);

    if (isTargetMaster) {

      teacher.person.category = { id: targetCategory } as PersonCategory;
      teacher.school = { id: Number(body.school) } as School;

      await this.qEndAllTeacherRelations(teacher.id);

      const disciplines = await CONN.find(Discipline);
      const classrooms = await CONN.find(Classroom, { where: { school: { id: Number(body.school) } } });

      const masterRelations = [];
      const repository = CONN.getRepository(TeacherClassDiscipline);

      for (const discipline of disciplines) {
        for (const classroom of classrooms) {
          const relation = repository.create({
            teacher: { id: teacher.id },
            discipline: { id: discipline.id },
            classroom: { id: classroom.id },
            startedAt: new Date(),
          });
          masterRelations.push(relation);
        }
      }
      if (masterRelations.length > 0) { await repository.save(masterRelations) }
    }
    else if (isTargetProfessor) {

      teacher.person.category = { id: targetCategory } as PersonCategory;

      await this.qEndAllTeacherRelations(teacher.id);

      await this.updateTeacherClassesAndDisciplines(teacher, CONN, body);
    }

    await CONN.save(Teacher, teacher);

    return { status: 200, data: teacher };
  }

  async updateTeacherClassesAndDisciplines(teacher: Teacher, CONN: EntityManager, body: TeacherBody) {

    const targetCategory = Number(body.category);
    const currentCategory = Number(teacher.person.category.id);

    const MASTER_ROLES = [
      Number(pc.DIRE),
      Number(pc.VICE),
      Number(pc.COOR)
    ];

    const isBecomingMaster = MASTER_ROLES.includes(targetCategory) && targetCategory !== currentCategory;
    const isDemotingToTeacher = targetCategory === Number(pc.PROF) && MASTER_ROLES.includes(currentCategory);

    if (isBecomingMaster || isDemotingToTeacher) { return await this.changeTeacherMasterSchool(body, teacher, CONN) }

    const qDbRelationShip = (await this.qTeacherRelationship(teacher.id)).teacherClassesDisciplines;
    const repository = CONN.getRepository(TeacherClassDiscipline);
    const toSave: TeacherClassDiscipline[] = [];

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
        const toSavePush = repository.create({ ...dataBaseRow, endedAt: new Date() } as unknown as TeacherClassDiscipline)
        toSave.push(toSavePush);
        continue;
      }

      if (bodyElement.id && bodyElement.active && hasValidData && dataBaseRow) {
        const updateData: any = { ...dataBaseRow, endedAt: null };
        if (hasValidContract) updateData.contract = { id: bodyElement.contract };
        const toSavePush = repository.create(updateData) as unknown as TeacherClassDiscipline;
        toSave.push(toSavePush);
        continue;
      }

      if (bodyElement.id === null && !dataBaseRow && bodyElement.active && hasValidData) {
        const newRelationship: any = {
          teacher: { id: bodyElement.teacherId },
          discipline: { id: bodyElement.disciplineId },
          classroom: { id: bodyElement.classroomId },
          startedAt: new Date()
        };
        if (hasValidContract) newRelationship.contract = { id: bodyElement.contract };
        const toSavePush = repository.create(newRelationship) as unknown as TeacherClassDiscipline;
        toSave.push(toSavePush);
      }
    }

    if (toSave.length > 0) { await repository.save(toSave) }

    if (Number(body.school) !== Number(teacher.school.id)) { teacher.school = { id: Number(body.school) } as School }

    await CONN.save(Teacher, teacher);
    return { status: 200, data: teacher };
  }

  async saveTeacher(body: TeacherBody) {
    try {
      return await AppDataSource.transaction(async (CONN) => {

        const qUserTeacher = await this.qTeacherByUser(body.user.user)

        const canChangeErr = "Você não tem permissão para criar uma pessoa com esta categoria."
        if (!this.canChange(qUserTeacher.person.category.id, body.category.id)) { return { status: 403, message: canChangeErr }}

        const registerExists = await CONN.findOne(Teacher, { where: { register: body.register } });
        if (registerExists) { return { status: 409, message: "Já existe um registro com este número de matrícula." } }

        const emailExists = await CONN.findOne(Teacher, { where: { email: body.email.toLowerCase().trim() }});
        if (emailExists) { return { status: 409, message: "Já existe um registro com este email." } }

        const category = (await CONN.findOne(PersonCategory, {where: { id: body.category.id }})) as PersonCategory;

        const person = this.createPerson({ name: body.name.toUpperCase().trim(), birth: body.birth, category });
        const teacher = await CONN.save(Teacher, this.createTeacher(qUserTeacher.person.user.id, person, body));

        const { username, passwordObject, email } = await this.generateUser(body);
        await CONN.save(User, { person, username, email, password: passwordObject.hashedPassword });

        if (
          body.category.id === pc.DIRE || body.category.id === pc.VICE ||
          body.category.id === pc.COOR || body.category.id === pc.SECR ||
          body.category.id === pc.MONI
        ) {
          const disciplines = await CONN.getRepository(Discipline).find();
          const classrooms = await CONN.getRepository(Classroom).find({ where: { school: { id: body.school } } });

          const relationsToSave = [];

          for(let discipline of disciplines) {
            for(let classroom of classrooms) {
              relationsToSave.push({ teacher: teacher, classroom: { id: classroom.id }, discipline: { id: discipline.id }, startedAt: new Date() });
            }
          }

          if (relationsToSave.length > 0) await CONN.save(TeacherClassDiscipline, relationsToSave);
        }

        if (body.category.id === pc.PROF) {
          const relationsToSave = body.teacherClassesDisciplines.map(rel => {
            const saveData = { teacher: teacher, classroom: { id: rel.classroomId }, discipline: { id: rel.disciplineId }, startedAt: new Date() };
            if(rel.contract && (rel.contract === 1 || rel.contract === 2)) { Object.assign(saveData, { contract: { id: rel.contract } as Contract }) }
            return saveData;
          });

          if (relationsToSave.length > 0) await CONN.save(TeacherClassDiscipline, relationsToSave);
        }

        await credentialsEmail(body.email, passwordObject.password, true).catch((e) => console.log(e));

        return { status: 201, data: teacher };
      });
    }
    catch (error: any) { return { status: 500, message: error.message } }
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

  async generateUser(body: TeacherBody) {
    const username = body.email;
    const email = body.email;
    const passwordObject = await generatePassword()

    return { username, passwordObject, email };
  }

  methods(teacher: Teacher, CONN: EntityManager, body: TeacherBody) {
    return {
      [pc.ADMN]: async () => await this.adminSupeFormUpdateMethod(teacher, CONN),
      [pc.SUPE]: async () => await this.adminSupeFormUpdateMethod(teacher, CONN),
      [pc.FORM]: async () => await this.adminSupeFormUpdateMethod(teacher, CONN),
      [pc.DIRE]: async () => await this.changeTeacherMasterSchool(body, teacher, CONN),
      [pc.VICE]: async () => await this.changeTeacherMasterSchool(body, teacher, CONN),
      [pc.COOR]: async () => await this.changeTeacherMasterSchool(body, teacher, CONN),
      [pc.SECR]: async () => await this.changeTeacherMasterSchool(body, teacher, CONN),
      [pc.MONI]: async () => await this.changeTeacherMasterSchool(body, teacher, CONN),
      [pc.PROF]: async () => await this.updateTeacherClassesAndDisciplines(teacher, CONN, body)
    }
  }

  private canChange(uCategory: number, tCategory: number): boolean {
    const allowedTargets = ROLE_PERMISSIONS[uCategory];
    return allowedTargets ? allowedTargets.includes(tCategory) : false;
  }
}

export const teacherController = new TeacherController();

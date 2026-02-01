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
import { TRANSFER_STATUS } from "../utils/enums";
import { discController } from "./discipline";
import { classroomController } from "./classroom";
import { PERSON_CATEGORIES } from "../utils/enums";
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

        classrooms = classrooms?.filter(classroom => ![1216, 1217, 1218].includes(classroom.id))

        return { status: 200, data: { disciplines, classrooms, personCategories, schools, contracts } }
      })
    } catch (error: any) { return { status: 500, message: error.message } }
  }

  async findAllWhereTeacher(request: Request ) {

    const search = request?.query.search ?? "";
    const body = request?.body as TeacherBody;
    const option = Number(request?.query.option)

    try {

      const qUserTeacher = await this.qTeacherByUser(body.user.user)
      const qTeacherClasses = await this.qTeacherClassrooms(body.user.user)
      let response: {}[] = [];

      if([PERSON_CATEGORIES.ADMN, PERSON_CATEGORIES.SUPE, PERSON_CATEGORIES.FORM].includes(qUserTeacher.person.category.id)) {
        return option === 1 ? { status: 200, data: await this.qAllTeachersForSuperUser((search as string) ?? '') } : { status: 200, data: [] }
      }

      if(option === 1) {
        response = await this.qTeacherThatBelongs(qTeacherClasses.classrooms, (search as string) ?? '')
      }

      if(option === 2) {
        response = await this.qTeacherThatNotBelongs(qTeacherClasses.classrooms, PERSON_CATEGORIES.PROF,(search as string) ?? '')
      }

      return { status: 200, data: response };
    }
    catch (error: any) { console.log(error); return { status: 500, message: error.message } }
  }

  async findOneTeacher(id: string | number, request?: Request) {

    const body = request?.body as TeacherBody;

    try {
      const qUserTeacher = await this.qTeacherByUser(body.user.user)
      const qUserTeacherClasses = await this.qTeacherClassrooms(body.user.user)

      const cannotChange = [PERSON_CATEGORIES.MONI, PERSON_CATEGORIES.PROF];

      if ( qUserTeacher.id !== Number(id) && cannotChange.includes(qUserTeacher.person.category.id) ) { return { status: 403, message: "Você não tem permissão para visualizar este registro." } }

      const qTeacher = await this.qTeacherRelationship(id)
      if (!qTeacher.id) { return { status: 404, message: "Dado não encontrado" } }
      const qTeacherClassrooms = qTeacher.teacherClassesDisciplines.map(el => el.classroomId)

      if(![PERSON_CATEGORIES.ADMN, PERSON_CATEGORIES.FORM, PERSON_CATEGORIES.SUPE].includes(qUserTeacher.person.category.id) ) {
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

        if (qUserTeacher.person.category.id === PERSON_CATEGORIES.PROF || (qUserTeacher.person.category.id === PERSON_CATEGORIES.MONI && qUserTeacher.id !== teacher.id)) {
          return { status: 403, message: "Você não tem permissão para editar este registro." };
        }

        teacher.person.name = body.name;
        teacher.person.birth = body.birth;
        teacher.register = body.register;
        teacher.updatedAt = new Date();
        teacher.updatedByUser = qUserTeacher.person.user.id;
        teacher.observation = body.observation;

        if (teacher.person.category.id != PERSON_CATEGORIES.ADMN && teacher.person.category.id != PERSON_CATEGORIES.SUPE && teacher.person.category.id != PERSON_CATEGORIES.FORM && teacher.school === null) {

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
    catch ( error: any ) {
      console.error( error );
      return { status: 500, message: error.message }
    }
  }

  async adminSupeFormUpdateMethod(teacher: Teacher, CONN: EntityManager) {
    await CONN.save(Teacher, teacher); return { status: 200, data: teacher }
  }

  async changeTeacherMasterSchool(body: TeacherBody, teacher: Teacher, CONN: EntityManager) {

    const targetCategory = Number(body.category);

    // Agrupamento dos cargos "Master" (que têm acesso total)
    const MASTER_ROLES = [
      Number(PERSON_CATEGORIES.DIRE), // Diretor
      Number(PERSON_CATEGORIES.VICE), // Vice-Diretor
      Number(PERSON_CATEGORIES.COOR)  // Coordenador
    ];

    const isTargetMaster = MASTER_ROLES.includes(targetCategory);
    const isTargetProfessor = targetCategory === Number(PERSON_CATEGORIES.PROF);

    // ---------------------------------------------------------------------------
    // CENÁRIO A: Tornando-se (ou trocando entre) DIRETOR, VICE ou COORDENADOR
    // ---------------------------------------------------------------------------
    // Cobre: Prof->Dir, Prof->Vice, Prof->Coord, Vice->Dir, Coord->Vice, etc.
    if (isTargetMaster) {

      // 1. Atualiza dados cadastrais
      teacher.person.category = { id: targetCategory } as PersonCategory;
      teacher.school = { id: Number(body.school) } as School;

      // 2. Limpa TODOS os vínculos anteriores (seja de prof ou de outro cargo master)
      await this.qEndAllTeacherRelations(teacher.id);

      // 3. Gera vínculos com TUDO da escola alvo (Regra Master)
      const disciplines = await CONN.find(Discipline);
      const classrooms = await CONN.find(Classroom, { where: { school: { id: Number(body.school) } } });

      // Otimização Bulk Insert (Performance Extrema)
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

      if (masterRelations.length > 0) {
        await repository.save(masterRelations);
      }
    }

      // ---------------------------------------------------------------------------
      // CENÁRIO B: Tornando-se PROFESSOR (Vindo de qualquer cargo de gestão)
      // ---------------------------------------------------------------------------
    // Cobre: Dir->Prof, Vice->Prof, Coord->Prof
    else if (isTargetProfessor) {

      // 1. Atualiza categoria imediatamente
      teacher.person.category = { id: targetCategory } as PersonCategory;

      // 2. Limpa os vínculos "Master" antigos (pois agora ele terá vínculos específicos)
      await this.qEndAllTeacherRelations(teacher.id);

      // 3. Chama o método que lê o body para criar os vínculos específicos de aula
      // Nota: A escola será atualizada dentro deste método se necessário
      await this.updateTeacherClassesAndDisciplines(teacher, CONN, body);
    }

    // Salva o Teacher (Categoria e Escola atualizadas)
    await CONN.save(Teacher, teacher);

    return { status: 200, data: teacher };
  }

  async updateTeacherClassesAndDisciplines(teacher: Teacher, CONN: EntityManager, body: TeacherBody) {

    const targetCategory = Number(body.category);
    const currentCategory = Number(teacher.person.category.id);

    // Definição de quem são os "Masters"
    const MASTER_ROLES = [
      Number(PERSON_CATEGORIES.DIRE),
      Number(PERSON_CATEGORIES.VICE),
      Number(PERSON_CATEGORIES.COOR)
    ];

    // 1. Redirecionamento de Fluxo (Promotion/Role Change Logic)
    // Se o destino é um cargo Master E o cargo atual é diferente do destino...
    // ...OU se estou saindo de um cargo Master para virar Professor.
    const isBecomingMaster = MASTER_ROLES.includes(targetCategory) && targetCategory !== currentCategory;
    const isDemotingToTeacher = targetCategory === Number(PERSON_CATEGORIES.PROF) && MASTER_ROLES.includes(currentCategory);

    if (isBecomingMaster || isDemotingToTeacher) {
      return await this.changeTeacherMasterSchool(body, teacher, CONN);
    }

    // --- DAQUI PRA BAIXO SEGUE O CÓDIGO PADRÃO DE PROFESSOR (OTIMIZADO) ---

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

      // Caso A: Desativar
      if (dataBaseRow && !bodyElement.active) {
        const toSavePush = repository.create({ ...dataBaseRow, endedAt: new Date() } as unknown as TeacherClassDiscipline)
        toSave.push(toSavePush);
        continue;
      }

      // Caso B: Atualizar
      if (bodyElement.id && bodyElement.active && hasValidData && dataBaseRow) {
        const updateData: any = { ...dataBaseRow, endedAt: null };
        if (hasValidContract) updateData.contract = { id: bodyElement.contract };
        const toSavePush = repository.create(updateData) as unknown as TeacherClassDiscipline;
        toSave.push(toSavePush);
        continue;
      }

      // Caso C: Criar Novo
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

    if (toSave.length > 0) {
      await repository.save(toSave);
    }

    // Atualiza escola se necessário (Caso Prof -> Prof em outra escola)
    if (Number(body.school) !== Number(teacher.school.id)) {
      teacher.school = { id: Number(body.school) } as School;
    }

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

        const message = "Já existe um registro com este número de matrícula."
        if (registerExists) { return { status: 409,  message } }

        const emailExists = await CONN.findOne(Teacher, {where: { email: body.email }});
        if (emailExists) {return {status: 409,message: "Já existe um registro com este email."}}

        const category = (await CONN.findOne(PersonCategory, {where: { id: body.category.id }})) as PersonCategory;

        const person = this.createPerson({ name: body.name.toUpperCase().trim(), birth: body.birth,category });

        const teacher = await CONN.save(Teacher, this.createTeacher(qUserTeacher.person.user.id, person, body));

        const { username, passwordObject, email } = this.generateUser(body);

        await CONN.save(User, { person, username, email, password: passwordObject.hashedPassword });

        if(body.category.id === PERSON_CATEGORIES.ADMN || body.category.id === PERSON_CATEGORIES.SUPE || body.category.id === PERSON_CATEGORIES.FORM ) {
          await credentialsEmail(body.email, passwordObject.password, true).catch((e) => console.log(e) );
          return { status: 201, data: teacher }
        }

        if(body.category.id === PERSON_CATEGORIES.DIRE || body.category.id === PERSON_CATEGORIES .VICE || body.category.id === PERSON_CATEGORIES.COOR || body.category.id === PERSON_CATEGORIES.SECR || body.category.id === PERSON_CATEGORIES.MONI) {

          const disciplines = await CONN.getRepository(Discipline).find()
          const classrooms = await CONN.getRepository(Classroom).find({ where: { school: { id: body.school } } })

          for(let discipline of disciplines) {
            for(let classroom of classrooms) {
              await CONN.save(TeacherClassDiscipline, { teacher: teacher, classroom: { id: classroom.id }, discipline: { id: discipline.id }, startedAt: new Date() })
            }
          }

          await credentialsEmail(body.email, passwordObject.password, true).catch((e) => console.log(e))

          return { status: 201, data: teacher }
        }

        if(body.category.id === PERSON_CATEGORIES.PROF) {
          for (const rel of body.teacherClassesDisciplines) {

            const saveData = { teacher: teacher, classroom: { id: rel.classroomId }, discipline: { id: rel.disciplineId }, startedAt: new Date() }

            if(rel.contract && rel.contract === 1 || rel.contract === 2) { Object.assign(saveData, { contract: { id: rel.contract } as Contract }) }

            await CONN.save(TeacherClassDiscipline, saveData)
          }

          await credentialsEmail(body.email, passwordObject.password, true).catch((e) => console.log(e))

          return { status: 201, data: teacher }
        }

        await credentialsEmail(body.email, passwordObject.password, true).catch((e) => console.log(e))

        return { status: 201, data: teacher }
      })
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

  generateUser(body: TeacherBody) {
    const username = body.email;
    const email = body.email;
    const passwordObject = generatePassword()

    return { username, passwordObject, email };
  }

  methods(teacher: Teacher, CONN: EntityManager, body: TeacherBody) {
    return {
      [PERSON_CATEGORIES.ADMN]: async () => await this.adminSupeFormUpdateMethod(teacher, CONN),
      [PERSON_CATEGORIES.SUPE]: async () => await this.adminSupeFormUpdateMethod(teacher, CONN),
      [PERSON_CATEGORIES.FORM]: async () => await this.adminSupeFormUpdateMethod(teacher, CONN),
      [PERSON_CATEGORIES.DIRE]: async () => await this.changeTeacherMasterSchool(body, teacher, CONN),
      [PERSON_CATEGORIES.VICE]: async () => await this.changeTeacherMasterSchool(body, teacher, CONN),
      [PERSON_CATEGORIES.COOR]: async () => await this.changeTeacherMasterSchool(body, teacher, CONN),
      [PERSON_CATEGORIES.SECR]: async () => await this.changeTeacherMasterSchool(body, teacher, CONN),
      [PERSON_CATEGORIES.MONI]: async () => await this.changeTeacherMasterSchool(body, teacher, CONN),
      [PERSON_CATEGORIES.PROF]: async () => await this.updateTeacherClassesAndDisciplines(teacher, CONN, body)
    }
  }

  private canChange(uCategory: number, tCategory: number): boolean {
    // Define quem pode alterar quem
    const permissions: Record<number, number[]> = {
      [PERSON_CATEGORIES.SECR]: [PERSON_CATEGORIES.PROF, PERSON_CATEGORIES.MONI],

      [PERSON_CATEGORIES.COOR]: [PERSON_CATEGORIES.PROF, PERSON_CATEGORIES.MONI, PERSON_CATEGORIES.SECR],

      [PERSON_CATEGORIES.VICE]: [PERSON_CATEGORIES.PROF, PERSON_CATEGORIES.MONI, PERSON_CATEGORIES.SECR, PERSON_CATEGORIES.COOR],

      [PERSON_CATEGORIES.DIRE]: [PERSON_CATEGORIES.PROF, PERSON_CATEGORIES.MONI, PERSON_CATEGORIES.SECR, PERSON_CATEGORIES.COOR, PERSON_CATEGORIES.VICE],

      [PERSON_CATEGORIES.SUPE]: [PERSON_CATEGORIES.PROF, PERSON_CATEGORIES.MONI, PERSON_CATEGORIES.SECR, PERSON_CATEGORIES.COOR, PERSON_CATEGORIES.VICE, PERSON_CATEGORIES.DIRE, PERSON_CATEGORIES.FORM],

      [PERSON_CATEGORIES.ADMN]: [PERSON_CATEGORIES.PROF, PERSON_CATEGORIES.MONI, PERSON_CATEGORIES.SECR, PERSON_CATEGORIES.COOR, PERSON_CATEGORIES.VICE, PERSON_CATEGORIES.DIRE, PERSON_CATEGORIES.FORM, PERSON_CATEGORIES.SUPE]
    };

    // Se o usuário não estiver na lista (ex: PROF), retorna false (Fail-safe)
    const allowedTargets = permissions[uCategory];

    // Verifica se o alvo está na lista de permitidos desse usuário
    return allowedTargets ? allowedTargets.includes(tCategory) : false;
  }
}

export const teacherController = new TeacherController();

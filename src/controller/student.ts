import { StudentClassroom } from "../model/StudentClassroom";
import { GenericController } from "./genericController";
import { Brackets, EntityManager, EntityTarget, FindOneOptions, In, IsNull } from "typeorm";
import { Student } from "../model/Student";
import { AppDataSource } from "../data-source";
import { PersonCategory } from "../model/PersonCategory";
import { pc } from "../utils/personCategories";
import { StudentDisability } from "../model/StudentDisability";
import { Disability } from "../model/Disability";
import { State } from "../model/State";
import { GraduateBody, InactiveNewClassroom, SaveStudent, StudentClassroomFnOptions, StudentClassroomReturn, UserInterface } from "../interfaces/interfaces";
import { Person } from "../model/Person";
import { Request } from "express";
import { ISOWNER } from "../utils/owner";
import { Classroom } from "../model/Classroom";
import { Transfer } from "../model/Transfer";
import { TransferStatus } from "../model/TransferStatus";
import { Year } from "../model/Year";
import { stateController } from "./state";
import { teacherClassroomsController } from "./teacherClassrooms";
import { Teacher } from "../model/Teacher";
import { transferStatus } from "../utils/transferStatus";
import getTimeZone from "../utils/getTimeZone";
import { dbConn} from "../services/db";
import { PoolConnection } from "mysql2/promise";
import { isJSON } from "class-validator";

class StudentController extends GenericController<EntityTarget<Student>> {

  constructor() { super(Student) }

  async studentForm(req: Request) {

    try {

      return await AppDataSource.transaction(async(CONN) => {

        const states = (await stateController.findAllWhere({}, req, CONN)).data;
        const disabilities = await CONN.find(Disability, { order: { official: 'DESC', name: "ASC" }})
        const teacherClassrooms = (await teacherClassroomsController.getAllTClass(req, CONN)).data;

        return { status: 200, data: { disabilities, states, teacherClassrooms } };
      })
    } catch (error: any) { return { status: 500, message: error.message } }
  }

  async getAllInactivates(request: Request) {

    const limit =  !isNaN(parseInt(request.query.limit as string)) ? parseInt(request.query.limit as string) : 100
    const offset =  !isNaN(parseInt(request.query.offset as string)) ? parseInt(request.query.offset as string) : 0

    let sqlConnection = await dbConn()

    try {

      return AppDataSource.transaction(async(CONN) => {

        const currentYear = await this.qCurrentYear(sqlConnection)

        if (!currentYear) { return { status: 404, message: "Não existe um ano letivo ativo. Entre em contato com o Administrador do sistema." } }

        const lastYearName = Number(currentYear.name) - 1
        const lastYearDB = await CONN.findOne(Year, { where: { name: lastYearName.toString() } })

        if (!lastYearDB) { return { status: 404, message: `Não existe ano letivo anterior ou posterior a ${currentYear.name}.`} }

        const preResult = await AppDataSource.getRepository(Student)
          .createQueryBuilder("student")
          .leftJoinAndSelect("student.person", "person")
          .leftJoinAndSelect("student.state", "state")
          .leftJoinAndSelect("student.studentClassrooms", "studentClassroom")
          .leftJoinAndSelect("studentClassroom.classroom", "classroom")
          .leftJoinAndSelect("classroom.school", "school")
          .leftJoinAndSelect("studentClassroom.year", "year")
          .where("studentClassroom.endedAt IS NOT NULL")
          .andWhere("student.active = 1")
          .andWhere( new Brackets((qb) => {
            qb.where("person.name LIKE :search", { search: `%${ request.query.search} %` })
              .orWhere("student.ra LIKE :search", { search: `%${ request.query.search }%` })
              .orWhere("school.shortName LIKE :search", { search: `%${ request.query.search }%` })
              .orWhere("school.name LIKE :search", { search: `%${ request.query.search }%` })
          }))
          .andWhere("year.name = :yearName", { yearName: request.params.year })
          .andWhere((qb) => { const subQueryNoCurrentYear = qb.subQuery().select("1").from("student_classroom", "sc1").where("sc1.studentId = student.id").andWhere("sc1.yearId = :currentYearId", { currentYearId: currentYear.id }).andWhere("sc1.endedAt IS NULL").getQuery(); return `NOT EXISTS ${subQueryNoCurrentYear}` })
          .andWhere((qb) => { const subQueryLastYearOrOlder = qb.subQuery().select("MAX(sc2.endedAt)").from("student_classroom", "sc2").where("sc2.studentId = student.id").andWhere("sc2.yearId <= :lastYearId", { lastYearId: lastYearDB.id }).getQuery(); return `studentClassroom.endedAt = (${subQueryLastYearOrOlder})` })
          .orderBy("school.shortName", "ASC")
          .addOrderBy("classroom.shortName", "ASC")
          .addOrderBy("studentClassroom.rosterNumber", "ASC")
          .take(limit)
          .skip(offset)
          .getMany();

        return { status: 200, data: preResult.map((student) => ({ ...student, studentClassrooms: this.getOneClassroom(student.studentClassrooms) }))};
      })
    }
    catch (error: any) { return { status: 500, message: error.message } }
    finally { if(sqlConnection) { sqlConnection.release() } }
  }

  async setInactiveNewClassroomList(body: { list: InactiveNewClassroom[], user: UserInterface }) {
    let sqlConnection = await dbConn()
    try {

      const currentYear = await this.qCurrentYear(sqlConnection)
      if (!currentYear) { return { status: 404, message: 'Não existe um ano letivo ativo. Entre em contato com o Administrador do sistema.' } }

      const lastYearName = Number(currentYear.name) - 1
      const lastYearDB = await this.qYearByName(sqlConnection, String(lastYearName))

      if (!lastYearDB) { return { status: 404, message: 'Não foi possível encontrar o ano letivo anterior.' } }

      const qUserTeacher = await this.qTeacherByUser(sqlConnection, body.user.user)

      for(let item of body.list) {
        const oldYearDB = await this.qYearById(sqlConnection, item.oldYear)
        if (!oldYearDB) { throw new Error(JSON.stringify({ status: 404, message: 'Não foi possível encontrar o ano letivo informado.' }))}

        const el = await this.qActiveSc(sqlConnection, item.student.id)
        if (el) { throw new Error(JSON.stringify({ status: 400, message: `O aluno ${el?.personName} está matriculado na sala ${el?.classroomName} ${el?.schoolName} em ${el?.yearName}. Solicite sua transferência através do menu Matrículas Ativas` }))}

        const result = await this.qLastRegister(sqlConnection, item.student.id, lastYearDB.id)
        if (result && result.length > 1 && Number(currentYear.name) - Number(oldYearDB.name) > 1) { throw new Error(JSON.stringify({ status: 409, message: `O aluno ${item.student.person.name} possui matrícula encerrada para o ano letivo de ${lastYearDB.name}. Acesse o ano letivo ${lastYearDB.name} em Passar de Ano e faça a transfêrencia.` }))}

        const classroom = await this.qClassroom(sqlConnection, item.newClassroom.id)
        const oldClassInDb = await this.qClassroom(sqlConnection, item.oldClassroom.id)

        if (Number(classroom.name.replace(/\D/g, '')) < Number(oldClassInDb.name.replace(/\D/g, ''))) { throw new Error(JSON.stringify({ status: 400, message: 'Regressão de sala não é permitido.' }))}

        const newStudentResult = await this.qNewStudentClassroom(sqlConnection, item.student.id, classroom.id, currentYear.id, qUserTeacher.person.user.id, item.rosterNumber)

        const newTransfer = await this.qNewTransfer(sqlConnection, qUserTeacher.person.user.id, classroom.id, oldClassInDb.id, qUserTeacher.person.user.id, item.student.id, currentYear.id, qUserTeacher.person.user.id)

        if(newTransfer.affectedRows !== 1 && newStudentResult.affectedRows !== 1) { throw new Error(JSON.stringify({ status: 400, message: 'Algum aluno selecionado está' + ' impedindo esta operação. Tente realizar a passagem de forma individual afim de detectar' + ' qual não é possível.' })) }
      }
      return { status: 200, data: {} };
    }
    catch (error: any) {
      if(!isJSON(error.message)) { return { status: 500, message: error.message } }
      const parsedError = JSON.parse(error.message) as { status: number; message: string }
      return { status: parsedError.status, message: parsedError.message }
    }
    finally { if(sqlConnection) { sqlConnection.release() } }
  }

  async setInactiveNewClassroom(body: InactiveNewClassroom, sqlConnectionParam?: PoolConnection) {

    // TODO: implementar verificação se há mudança de sala para o mesmo classroomNumber e mesmo ano.

    const { student, oldYear, newClassroom, oldClassroom } = body

    let sqlConnection = await dbConn()

    try {
      return await AppDataSource.transaction(async(CONN)=> {
        const currentYear = await this.qCurrentYear(sqlConnection)
        if (!currentYear) { return { status: 404, message: 'Não existe um ano letivo ativo. Entre em contato com o Administrador do sistema.' } }

        const qUserTeacher = await this.qTeacherByUser(sqlConnection, body.user.user)

        const activeSc = await CONN.findOne(StudentClassroom, {
          relations: ['classroom.school', 'student.person', 'year'], where: { student: { id: student.id }, endedAt: IsNull() }
        }) as StudentClassroom

        if (activeSc) {
          return { status: 409, message: `O aluno ${activeSc.student.person.name} está matriculado na sala ${activeSc.classroom.shortName} ${activeSc.classroom.school.shortName} em ${activeSc.year.name}. Solicite sua transferência através do menu Matrículas Ativas` }
        }

        const lastYearName = Number(currentYear.name) - 1
        const lastYearDB = await CONN.findOne(Year,{ where: { name: lastYearName.toString() } }) as Year
        const oldYearDB = await CONN.findOne(Year,{ where: { id: oldYear } }) as Year

        if (!lastYearDB) { return { status: 404, message: 'Não foi possível encontrar o ano letivo anterior.' } }
        if (!oldYearDB) { return { status: 404, message: 'Não foi possível encontrar o ano letivo informado.' } }

        const lastRegister: Student | null = await CONN.getRepository(Student)
          .createQueryBuilder('student')
          .leftJoinAndSelect('student.person', 'person')
          .leftJoinAndSelect('student.state', 'state')
          .leftJoinAndSelect('student.studentClassrooms', 'studentClassroom')
          .leftJoinAndSelect('studentClassroom.classroom', 'classroom')
          .leftJoinAndSelect('classroom.school', 'school')
          .leftJoinAndSelect('studentClassroom.year', 'year')
          .where('studentClassroom.endedAt IS NOT NULL')
          .andWhere('student.id = :studentId', { studentId: student.id })
          .andWhere('year.id = :yearId', { yearId: lastYearDB.id })
          .andWhere(qb => {
            const subQueryMaxEndedAt = qb
              .subQuery()
              .select('MAX(sc2.endedAt)')
              .from('student_classroom', 'sc2')
              .where('sc2.studentId = student.id')
              .andWhere('sc2.yearId = :yearId', { yearId: lastYearDB.id })
              .getQuery();

            return `studentClassroom.endedAt = (${subQueryMaxEndedAt})`;
          })
          .getOne();

        if (lastRegister && lastRegister?.studentClassrooms.length > 0 && Number(currentYear.name) - Number(oldYearDB.name) > 1) { return { status: 409, message: `O aluno ${lastRegister.person.name} possui matrícula encerrada para o ano letivo de ${lastYearDB.name}. Acesse o ano letivo ${lastYearDB.name} em Passar de Ano e faça a transfêrencia.` } }

        const classroom = await CONN.findOne(Classroom, { where: { id: newClassroom.id } }) as Classroom
        const oldClassInDb = await CONN.findOne(Classroom, { where: { id: oldClassroom.id } }) as Classroom

        const outsidersClassrooms = [1216, 1217, 1218]

        if(!outsidersClassrooms.includes(classroom.id)) {
          if (Number(classroom.name.replace(/\D/g, '')) < Number(oldClassInDb.name.replace(/\D/g, ''))) { return { status: 400, message: 'Regressão de sala não é permitido.' } }
        }

        const newStudentClassroom = await CONN.save(StudentClassroom, {
          student: student,
          classroom: classroom,
          year: currentYear,
          rosterNumber: 99,
          startedAt: new Date(),
          createdByUser: qUserTeacher.person.user.id
        }) as StudentClassroom

        await AppDataSource.getRepository(Transfer).save({
          startedAt: new Date(),
          endedAt: new Date(),
          requester: qUserTeacher,
          requestedClassroom: classroom,
          currentClassroom: oldClassInDb,
          receiver: qUserTeacher,
          student: student,
          status: await CONN.findOne(TransferStatus, { where: { id: 1, name: 'Aceitada' } }) as TransferStatus,
          year: currentYear,
          createdByUser: qUserTeacher.person.user.id
        })
        return { status: 200, data: newStudentClassroom };
      })
    }
    catch (error: any) { return { status: 500, message: error.message } }
    finally { if(sqlConnection) { sqlConnection.release() } }
  }

  async allStudents(req: Request) {

    let sqlConnection = await dbConn()

    try {

      const qUserTeacher = await this.qTeacherByUser(sqlConnection, req.body.user.user)
      const teacherClasses = await this.qTeacherClassrooms(sqlConnection, req?.body.user.user)
      const masterTeacher = qUserTeacher.person.category.id === pc.ADMN || qUserTeacher.person.category.id === pc.SUPE || qUserTeacher.person.category.id === pc.FORM

      const limit =  !isNaN(parseInt(req.query.limit as string)) ? parseInt(req.query.limit as string) : 100
      const offset =  !isNaN(parseInt(req.query.offset as string)) ? parseInt(req.query.offset as string) : 0

      const studentsClassrooms = await this.studentsClassrooms(
        { search: req.query.search as string, year: req.params.year, teacherClasses, owner: req.query.owner as string },
        masterTeacher,
        limit,
        offset,
        sqlConnection
      )

      return { status: 200, data: studentsClassrooms }

    }
    catch (error: any) { return { status: 500, message: error.message } }
    finally { if(sqlConnection) { sqlConnection.release() } }
  }

  async findOneStudentById(req: Request) {

    const { params, body } = req

    let sqlConnection = await dbConn()

    try {
      return await AppDataSource.transaction(async(CONN) => {

        const options = { relations: ["person.category"], where: { person: { user: { id: body?.user.user } } } }
        const uTeacher = await CONN.findOne(Teacher, {...options})

        const masterUser = uTeacher?.person.category.id === pc.ADMN || uTeacher?.person.category.id === pc.SUPE || uTeacher?.person.category.id === pc.FORM

        const teacherClasses = await this.qTeacherClassrooms(sqlConnection, req?.body.user.user)

        const preStudent = await this.student(Number(params.id), CONN)

        if (!preStudent) { return { status: 404, message: "Registro não encontrado" } }

        const data = this.studentResponse(preStudent)

        if (teacherClasses.classrooms.length > 0 && !teacherClasses.classrooms.includes(data.classroom.id) && !masterUser ) { return { status: 403, message: "Você não tem permissão para acessar esse registro." } }
        return { status: 200, data }
      })
    }
    catch (error: any) { return { status: 500, message: error.message } }
    finally { if(sqlConnection) { sqlConnection.release() } }
  }

  override async save(body: SaveStudent) {

    const rosterNumber = parseInt(body.rosterNumber, 10)

    let sqlConnection = await dbConn()

    try {

      return await AppDataSource.transaction(async (CONN) => {

        const qUserTeacher = await this.qTeacherByUser(sqlConnection, body.user.user)

        const tClasses = await this.qTeacherClassrooms(sqlConnection, body.user.user)

        const qCurrentYear = await this.qCurrentYear(sqlConnection);
        const state = await this.qState(sqlConnection, body.state) as State
        const classroom = await this.qClassroom(sqlConnection, body.classroom)
        const category = await this.studentCategory(CONN);
        const disabilities = await this.disabilities(body.disabilities, CONN);
        const person = this.createPerson({ name: body.name.toUpperCase().trim(), birth: body.birth, category });

        if (!qCurrentYear) { return { status: 404, message: "Não existe um ano letivo ativo. Entre em contato com o Administrador do sistema." } }

        const preExistsCheck = await CONN.findOne(Student, { relations: ['person'], where: { ra: body.ra }})

        if (preExistsCheck) {

          const date = new Date(preExistsCheck.person.birth)
          const formattedDate = date.toISOString().slice(0, 10)

          const bodyDate = new Date(body.birth)
          const formattedDateBody = bodyDate.toISOString().slice(0, 10)

          const sameBirthDate = formattedDate === formattedDateBody

          const localName = preExistsCheck.person.name
          const bodyName = body.name

          if (this.isSimilar(localName, bodyName) && sameBirthDate) {
            return { status: 409, message: `Existe um aluno com dados semelhantes ao qual está tentando cadastrar. ${preExistsCheck.person.name}, RA ${preExistsCheck.ra} e nascimento ${ formattedDateBody }. Comunique ao Administrador do sistema.` }
          }
        }

        const exists = await CONN.findOne(Student, { where: { ra: body.ra, dv: body.dv } })

        if (exists) {
          const el = (await CONN.getRepository(Student)
            .createQueryBuilder("student")
            .leftJoinAndSelect("student.person", "person")
            .leftJoinAndSelect("student.studentClassrooms", "studentClassroom")
            .leftJoinAndSelect("studentClassroom.classroom", "classroom")
            .leftJoinAndSelect("classroom.school", "school")
            .leftJoinAndSelect("studentClassroom.year", "year")
            .where("student.ra = :ra", { ra: body.ra })
            .andWhere("student.dv = :dv", { dv: body.dv })
            .andWhere( new Brackets((qb) => { qb.where("studentClassroom.endedAt IS NULL").orWhere("studentClassroom.endedAt < :currentDate", { currentDate: new Date() })}) )
            .getOne()) as Student;

          let preR: StudentClassroom;

          const actStClassroom = el.studentClassrooms.find((sc) => sc.endedAt === null) as StudentClassroom;

          if (actStClassroom) { preR = actStClassroom }
          else { preR = el.studentClassrooms.find((sc) => getTimeZone(sc.endedAt) === Math.max(...el.studentClassrooms.map((sc) => getTimeZone(sc.endedAt)))) as StudentClassroom }

          if (!el.active) {
            return { status: 409, message: `RA existente. ${el.person.name} se formou em: ${preR?.classroom.shortName} ${preR?.classroom.school.shortName} no ano de ${preR?.year.name}.` }
          }

          return { status: 409, message: `Já existe um aluno com o RA informado. ${el.person.name} tem como último registro: ${preR?.classroom.shortName} ${preR?.classroom.school.shortName} no ano ${preR?.year.name}. ${preR?.endedAt === null ? `Acesse o menu MATRÍCULAS ATIVAS > OUTROS ALUNOS no ano de ${preR.year.name} e solicite sua transferência.` : `Acesse o menu PASSAR DE ANO no ano de ${preR.year.name}.`}`};
        }

        const message = "Você não tem permissão para criar um aluno nesta sala."
        if (body.user.category === pc.PROF) { if (!tClasses.classrooms.includes(classroom.id)) { return { status: 403, message }}}

        let student: Student | null = null;

        student = await CONN.save(Student, this.createStudent(body, person, state, qUserTeacher.person.user.id));

        if (!!disabilities.length) {
          const mappDis = disabilities.map((disability) => { return { student: student as Student, startedAt: new Date(), disability, createdByUser: qUserTeacher.person.user.id } as StudentDisability })
          await CONN.save(StudentDisability, mappDis);
        }

        const stObject = (await CONN.save(StudentClassroom, { student, classroom, year: qCurrentYear, rosterNumber, startedAt: new Date(), createdByUser: qUserTeacher.person.user.id })) as StudentClassroom;

        const notDigit = /\D/g; const classroomNumber = Number(stObject.classroom.shortName.replace(notDigit, ""));

        const tStatus = (await CONN.findOne(TransferStatus, { where: { id: 5, name: "Novo" }})) as TransferStatus;

        let currentYear = qCurrentYear as unknown as Year

        const transfer = { startedAt: new Date(), endedAt: new Date(), requester: qUserTeacher, requestedClassroom: classroom, currentClassroom: classroom, receiver: qUserTeacher, student, status: tStatus, createdByUser: qUserTeacher.person.user.id, year: currentYear } as Transfer

        await CONN.save(Transfer, transfer);

        return { status: 201, data: student as unknown as Student }
      })
    }
    catch (error: any) {
      console.log(error)
      return { status: 500, message: error.message }
    }
    finally { if(sqlConnection) { sqlConnection.release() } }
  }

  async bulkInsert(body: any) {

    let sqlConnection = await dbConn()

    try {
      return await AppDataSource.transaction(async (CONN) => {

        const qUserTeacher = await this.qTeacherByUser(sqlConnection, body.user.user)

        const tClasses = await this.qTeacherClassrooms(sqlConnection, body.user.user)

        const qCurrYear = await this.qCurrentYear(sqlConnection);

        for(let element of body.arrayOfData) {

          const rosterNumber = parseInt(element.rosterNumber, 10)

          const state = await this.qState(sqlConnection, element.state) as State
          const classroom = await this.qClassroom(sqlConnection, body.classroom)
          const category = await this.studentCategory(CONN);
          const person = this.createPerson({ name: element.name.toUpperCase().trim(), birth: element.birth, category });

          if (!qCurrYear) { return { status: 404, message: "Não existe um ano letivo ativo. Entre em contato com o Administrador do sistema." } }

          const exists = await CONN.findOne(Student, { where: { ra: element.ra, dv: element.dv } })

          if (exists) {
            const el = (await CONN.getRepository(Student)
              .createQueryBuilder("student")
              .leftJoinAndSelect("student.person", "person")
              .leftJoinAndSelect("student.studentClassrooms", "studentClassroom")
              .leftJoinAndSelect("studentClassroom.classroom", "classroom")
              .leftJoinAndSelect("classroom.school", "school")
              .leftJoinAndSelect("studentClassroom.year", "year")
              .where("student.ra = :ra", { ra: element.ra })
              .andWhere("student.dv = :dv", { dv: element.dv })
              .andWhere( new Brackets((qb) => { qb.where("studentClassroom.endedAt IS NULL").orWhere("studentClassroom.endedAt < :currentDate", { currentDate: new Date() })}) )
              .getOne()) as Student;

            let preR: StudentClassroom;

            const actStClassroom = el.studentClassrooms.find((sc) => sc.endedAt === null) as StudentClassroom;

            if (actStClassroom) { preR = actStClassroom }
            else { preR = el.studentClassrooms.find((sc) => getTimeZone(sc.endedAt) === Math.max(...el.studentClassrooms.map((sc) => getTimeZone(sc.endedAt)))) as StudentClassroom }

            if (!el.active) {
              return { status: 409, message: `RA existente. ${el.person.name} se formou em: ${preR?.classroom.shortName} ${preR?.classroom.school.shortName} no ano de ${preR?.year.name}.` }
            }

            return { status: 409, message: `Já existe um aluno com o RA informado. ${el.person.name} tem como último registro: ${preR?.classroom.shortName} ${preR?.classroom.school.shortName} no ano ${preR?.year.name}. ${preR.endedAt === null ? `Acesse o menu MATRÍCULAS ATIVAS no ano de ${preR.year.name}.` : `Acesse o menu PASSAR DE ANO no ano de ${preR.year.name}.`}`};
          }

          const message = "Você não tem permissão para criar um aluno nesta sala."
          if (body.user.category === pc.PROF) { if (!tClasses.classrooms.includes(classroom.id)) { return { status: 403, message }}}

          let student: Student | null = null;

          student = await CONN.save(Student, this.createStudentBulk(element, person, state, qUserTeacher.person.user.id));

          const stObject = (await CONN.save(StudentClassroom, { student, classroom, year: qCurrYear, rosterNumber, startedAt: new Date(), createdByUser: qUserTeacher.person.user.id })) as StudentClassroom;

          const notDigit = /\D/g; const classroomNumber = Number(stObject.classroom.shortName.replace(notDigit, ""));

          const tStatus = (await CONN.findOne(TransferStatus, { where: { id: 5, name: "Novo" }})) as TransferStatus;

          let currYear = qCurrYear as unknown as Year

          const transfer = { startedAt: new Date(), endedAt: new Date(), requester: qUserTeacher, requestedClassroom: classroom, currentClassroom: classroom, receiver: qUserTeacher, student, status: tStatus, createdByUser: qUserTeacher.person.user.id, year: currYear } as Transfer

          await CONN.save(Transfer, transfer);
        }

        return { status: 201, data: {} as unknown as Student }
      })
    }
    catch (error: any) {
      console.log('error', error)
      return { status: 500, message: error.message }
    }
    finally { if(sqlConnection) { sqlConnection.release()} }
  }

  async setFirstLevel(body: any) {
    let sqlConnection = await dbConn()
    try {

      const qUserTeacher = await this.qTeacherByUser(sqlConnection, body.user.user)

      if([pc.MONI, pc.SECR].includes(qUserTeacher.person.category.id)) {
        return { status: 403, message: 'Você não tem permissão para modificar este registro.' }
      }

      await this.qSetFirstLevel(sqlConnection, Number(body.student.id), Number(body.level.id), Number(body.user.user))
      return { status: 200, data: { message: 'done' } };
    }
    catch (error: any) { return { status: 500, message: error.message } }
    finally { if(sqlConnection) { sqlConnection.release() } }
  }

  override async updateId(studentId: number | string, body: any) {

    let sqlConnection = await dbConn()

    try {
      let result: any;
      return await AppDataSource.transaction(async (CONN) => {

        const qUserTeacher = await this.qTeacherByUser(sqlConnection, body.user.user)

        const dbStudentOptions: FindOneOptions<Student> = {
          relations: ["person", "studentDisabilities.disability", "state"], where: { id: Number(studentId) }
        }

        const dbStudent: Student = await CONN.findOne(Student, dbStudentOptions) as Student

        const bodyClass: Classroom | null = await CONN.findOne(Classroom, { where: { id: body.classroom } })

        const arrRel: string[] = ["student", "classroom", "year" ]

        const stClassroomOptions:  FindOneOptions<StudentClassroom> = {
          relations: arrRel, where: { id: Number(body.currentStudentClassroomId), student: { id: dbStudent.id }, endedAt: IsNull() }
        }

        const stClass: StudentClassroom | null = await CONN.findOne(StudentClassroom, {...stClassroomOptions})

        if (!dbStudent) { return { status: 404, message: "Registro não encontrado" } }
        if (!stClass) { return { status: 404, message: "Registro não encontrado" } }
        if (!bodyClass) { return { status: 404, message: "Sala não encontrada" } }

        const cBodySRA: string = `${body.ra}${body.dv}`;
        const databaseStudentRa = `${dbStudent.ra}${dbStudent.dv}`;

        if(databaseStudentRa !== cBodySRA && qUserTeacher.person.category.id != pc.ADMN) {
          return { status: 403, message: 'Você não tem permissão para modificar o RA de um aluno. Solicite ao Administrador do sistema.' }
        }

        if (databaseStudentRa !== cBodySRA) {
          const exists: Student | null = await CONN.findOne(Student, { where: { ra: body.ra, dv: body.dv } });
          if (exists) { return { status: 409, message: "Já existe um aluno com esse RA" } }
        }

        const canChange: number[] = [ pc.ADMN, pc.DIRE, pc.VICE, pc.COOR, pc.SECR ]

        const message: string = "Você não tem permissão para alterar a sala de um aluno por aqui. Solicite a alguém com nível de acesso superior ao seu."
        if (!canChange.includes(qUserTeacher.person.category.id) && stClass?.classroom.id != bodyClass.id ) { return { status: 403, message } }

        const currentYear: Year = (await CONN.findOne(Year, { where: { endedAt: IsNull(), active: true } })) as Year

        const pedTransOptions:  FindOneOptions<Transfer> = {
          relations: ['requester.person', 'requestedClassroom.school'],
          where: {
            student: { id: stClass.student.id },
            currentClassroom: { id: stClass.classroom.id },
            status: { id: transferStatus.PENDING }, year: { id: currentYear.id }, endedAt: IsNull()
          }
        }

        const pendingTransfer: Transfer | null = await CONN.findOne(Transfer, pedTransOptions)

        if(pendingTransfer) { return { status: 403, message: `Existe um pedido de transferência ativo feito por: ${ pendingTransfer.requester.person.name } para a sala: ${ pendingTransfer.requestedClassroom.shortName } - ${ pendingTransfer.requestedClassroom.school.shortName }` } }

        if (stClass?.classroom.id != bodyClass.id && canChange.includes(qUserTeacher.person.category.id)) {

          const newNumber: number = Number(bodyClass.shortName.replace(/\D/g, ""))
          const oldNumber: number  = Number(stClass.classroom.shortName.replace(/\D/g, ""))

          if(!isNaN(newNumber) && !isNaN(oldNumber) && ![1216, 1217, 1218].includes(bodyClass.id)) {
            if (newNumber < oldNumber) { return { status: 404, message: "Não é possível alterar a sala para uma sala com número menor que a atual." }}
          }

          await CONN.save(StudentClassroom, { ...stClass, endedAt: new Date(), updatedByUser: qUserTeacher.person.user.id });

          const lastRosterNumber = await CONN.find(StudentClassroom, { relations: ["classroom", "year"], where: { year: { id: currentYear.id }, classroom: { id: bodyClass.id } }, order: { rosterNumber: "DESC" }, take: 1 });

          let last = 1; if (lastRosterNumber[0]?.rosterNumber) { last = lastRosterNumber[0].rosterNumber + 1 }

          await CONN.save(StudentClassroom, { student: dbStudent, classroom: bodyClass, year: currentYear, rosterNumber: last, startedAt: new Date(), createdByUser: qUserTeacher.person.user.id });

          const notDigit = /\D/g; const classNumber = Number( bodyClass.shortName.replace(notDigit, "") );

          const transfer = new Transfer();
          transfer.createdByUser = qUserTeacher.person.user.id;
          transfer.startedAt = new Date();
          transfer.endedAt = new Date();
          transfer.requester = qUserTeacher as Teacher;
          transfer.requestedClassroom = bodyClass;
          transfer.currentClassroom = stClass.classroom;
          transfer.receiver = qUserTeacher as Teacher;
          transfer.student = dbStudent;
          transfer.status = await CONN.findOne(TransferStatus, { where: { id: 1,name: "Aceitada" } }) as TransferStatus;
          transfer.year = await CONN.findOne(Year, { where: { endedAt: IsNull(), active: true } }) as Year;

          await CONN.save(Transfer, transfer);
        }

        if (stClass.classroom.id === bodyClass.id) { await CONN.save(StudentClassroom, {...stClass, rosterNumber: body.rosterNumber, createdAt: new Date(), createdByUser: qUserTeacher.person.user.id } as StudentClassroom )}

        dbStudent.ra = body.ra;
        dbStudent.dv = body.dv;
        dbStudent.updatedAt = new Date();
        dbStudent.updatedByUser = qUserTeacher.person.user.id;
        dbStudent.person.name = body.name.toUpperCase();
        dbStudent.person.birth = body.birth;
        dbStudent.observationOne = body.observationOne;
        dbStudent.observationTwo = body.observationTwo;
        dbStudent.state = await CONN.findOne(State, { where: { id: body.state } }) as State;

        const stDisabilities = dbStudent.studentDisabilities.filter((studentDisability) => !studentDisability.endedAt);

        await this.setDisabilities(qUserTeacher.person.user.id, await CONN.save(Student, dbStudent), stDisabilities, body.disabilities, CONN);

        result = this.studentResponse(await this.student(Number(studentId), CONN));

        return { status: 200, data: result };
      })
    }
    catch (error: any) { return { status: 500, message: error.message } }
    finally { if(sqlConnection) { sqlConnection.release() } }
  }

  async setDisabilities(uTeacherId:number, student: Student, studentDisabilities: StudentDisability[], body: number[], CONN: EntityManager ) {
    const currentDisabilities = studentDisabilities.map((studentDisability) => studentDisability.disability.id);

    const create = body.filter((disabilityId) => !currentDisabilities.includes(disabilityId));

    if (create.length) {
      const disabilities = create.map((disabilityId) => { return { createdByUser: uTeacherId, student, disability: { id: disabilityId }, startedAt: new Date() } as StudentDisability });
      await CONN.save(StudentDisability, disabilities);
    }

    const remove = currentDisabilities.filter((disabilityId) => !body.includes(disabilityId));

    if (remove.length) {
      for (let item of remove) {
        const studentDisability = studentDisabilities.find((studentDisability) => studentDisability.disability.id === item);
        if (studentDisability) {
          studentDisability.endedAt = new Date();
          studentDisability.updatedByUser = uTeacherId
          await CONN.save(StudentDisability, studentDisability);
        }
      }
    }
  }

  async studentCategory(CONN?: EntityManager) {
    if(!CONN){ return (await AppDataSource.getRepository(PersonCategory).findOne({ where: { id: pc.ALUN } })) as PersonCategory }
    return await CONN.findOne(PersonCategory, { where: { id: pc.ALUN } }) as PersonCategory
  }

  async disabilities(ids: number[], CONN?: EntityManager) {
    if(!CONN) { return await AppDataSource.getRepository(Disability).findBy({ id: In(ids) }) }
    return await CONN.findBy(Disability, { id: In(ids) })
  }

  async student(studentId: number, CONN: EntityManager) {
    return await CONN
      .createQueryBuilder()
      .select(["student.id", "student.ra", "student.dv", "student.observationOne", "student.observationTwo", "state.id", "state.acronym", "person.id", "person.name", "person.birth", "studentClassroom.id", "studentClassroom.rosterNumber", "studentClassroom.startedAt", "studentClassroom.endedAt", "classroom.id", "classroom.shortName", "school.id", "school.shortName", "GROUP_CONCAT(DISTINCT disability.id ORDER BY disability.id ASC) AS disabilities"])
      .from(Student, "student")
      .leftJoin("student.person", "person")
      .leftJoin("student.studentDisabilities","studentDisabilities","studentDisabilities.endedAt IS NULL")
      .leftJoin("studentDisabilities.disability", "disability")
      .leftJoin("student.state", "state")
      .leftJoin("student.studentClassrooms","studentClassroom","studentClassroom.endedAt IS NULL")
      .leftJoin("studentClassroom.classroom", "classroom")
      .leftJoin("classroom.school", "school")
      .where("student.id = :studentId", { studentId })
      .groupBy("studentClassroom.id")
      .getRawOne();
  }

  async studentsClassrooms(options: StudentClassroomFnOptions, masterUser: boolean, limit: number, offset: number, sqlConnection: any) {

    return await AppDataSource.transaction(async(CONN) => {

      const isOwner = options.owner === ISOWNER.OWNER;

      let yearName: string | undefined = ''

      yearName = options?.year

      if(yearName?.length != 4) {
        const response = await this.qCurrentYear(sqlConnection)
        yearName = response.name
      }

      let allClassrooms: Classroom[] = [];

      if (masterUser) { allClassrooms = (await CONN.find(Classroom)) }

      const result = await CONN.createQueryBuilder()
        .select(["studentClassroom.id", "studentClassroom.startedAt", "studentClassroom.rosterNumber", "student.id", "student.ra", "student.dv", "state.id", "state.acronym", "person.id", "person.name", "person.birth", "classroom.id", "classroom.shortName", "school.id", "school.shortName", "transfers.id", "transfers.startedAt", "requesterPerson.name", "transfersStatus.name", "requestedClassroom.shortName", 'requestedClassroomSchool.shortName' ])
        .from(Student, "student")
        .leftJoin("student.person", "person")
        .leftJoin("student.state", "state")
        .leftJoin("student.transfers", "transfers", "transfers.endedAt IS NULL")
        .leftJoin("transfers.status", "transfersStatus")
        .leftJoin("transfers.requestedClassroom", "requestedClassroom")
        .leftJoin("requestedClassroom.school", "requestedClassroomSchool")
        .leftJoin("transfers.requester", "requester")
        .leftJoin("requester.person", "requesterPerson")
        .leftJoin("student.studentClassrooms", "studentClassroom", "studentClassroom.endedAt IS NULL")
        .leftJoin("studentClassroom.classroom", "classroom")
        .leftJoin("classroom.school", "school")
        .leftJoin("studentClassroom.year", "year")
        .where("year.name = :yearName", { yearName })
        .andWhere( new Brackets((qb) => {
          qb.where("person.name LIKE :search", { search: `%${options.search}%` })
            .orWhere("student.ra LIKE :search", { search: `%${options.search}%` })
            .orWhere("classroom.shortName LIKE :search", { search: `%${options.search}%` })
            .orWhere("school.name LIKE :search", { search: `%${options.search}%` })
            .orWhere("school.shortName LIKE :search", { search: `%${options.search}%` })
        }))
        .andWhere( new Brackets((qb) => {
          if (!masterUser) { qb.andWhere(isOwner ? "classroom.id IN (:...classrooms)" : "classroom.id NOT IN (:...classrooms)", { classrooms: options.teacherClasses?.classrooms } ) } else { qb.andWhere( isOwner ? "classroom.id IN (:...classrooms)" : "classroom.id NOT IN (:...classrooms)", { classrooms: allClassrooms.map((classroom) => classroom.id)})}
        }))
        .orderBy("transfersStatus.id", "DESC")
        .addOrderBy("school.shortName", "ASC")
        .addOrderBy("classroom.shortName", "ASC")
        .addOrderBy("studentClassroom.rosterNumber", "ASC")
        .addOrderBy("person.name", "ASC")
        .limit(limit)
        .offset(offset)
        .getRawMany();

      return result.map((item) => {

        return {
          id: item.studentClassroom_id,
          startedAt: item.studentClassroom_startedAt,
          classroom: {
            id: item.classroom_id,
            shortName: item.classroom_shortName,
            teacher: options.teacherClasses,
            school: { shortName: item.school_shortName }
          },
          student: {
            id: item.student_id,
            ra: item.student_ra,
            dv: item.student_dv,
            state: { acronym: item.state_acronym },
            person: { name: item.person_name, birth: item.person_birth },
            transfer: item.transfers_id ? { id: item.transfers_id, startedAt: item.transfers_startedAt, status: { name: item.transfersStatus_name }, requester: { name: item.requesterPerson_name }, requestedClassroom: { classroom: item.requestedClassroom_shortName, school: item.requestedClassroomSchool_shortName } } : false,
          },
        }
      }) as StudentClassroomReturn[]
    })
  }

  createStudent(body: SaveStudent, person: Person, state: State, userId: number) {

    let formatedDv;

    const digit = body.dv.replace(/\D/g, "");
    if(digit.length) { formatedDv = body.dv }
    else { formatedDv = body.dv.toUpperCase() }

    const student = new Student()
    student.person = person
    student.ra = body.ra
    student.dv = formatedDv
    student.state = state
    student.createdByUser = userId
    student.createdAt = new Date()
    student.observationOne = body.observationOne
    student.observationTwo = body.observationTwo
    return student
  }

  createStudentBulk(body: SaveStudent, person: Person, state: State, userId: number) {

    let formatedDv;

    if(typeof body.dv === 'number') { formatedDv = body.dv }
    else { formatedDv = body.dv.toUpperCase() }

    const student = new Student()
    student.person = person
    student.ra = body.ra
    student.dv = formatedDv
    student.state = state
    student.createdByUser = userId
    student.createdAt = new Date()
    student.observationOne = body.observationOne
    student.observationTwo = body.observationTwo
    return student
  }

  studentResponse(student: any) {
    return {
      id: student.studentClassroom_id,
      rosterNumber: student.studentClassroom_rosterNumber,
      startedAt: student.studentClassroom_startedAt,
      endedAt: student.studentClassroom_endedAt,
      student: {
        id: student.student_id,
        ra: student.student_ra,
        dv: student.student_dv,
        observationOne: student.student_observationOne,
        observationTwo: student.student_observationTwo,
        state: {
          id: student.state_id,
          acronym: student.state_acronym,
        },
        person: {
          id: student.person_id,
          name: student.person_name,
          birth: student.person_birth,
        },
        disabilities:
          student.disabilities
            ?.split(",")
            .map((disabilityId: string) => Number(disabilityId)) ?? [],
      },
      classroom: {
        id: student.classroom_id,
        shortName: student.classroom_shortName,
        school: {
          id: student.school_id,
          shortName: student.school_shortName,
        },
      },
    };
  }

  getOneClassroom(array: StudentClassroom[]): StudentClassroom {
    const index: number = array.findIndex((sc: StudentClassroom): boolean => getTimeZone(sc.endedAt) === Math.max(...array.map((sc: StudentClassroom) => getTimeZone(sc.endedAt))));
    return array[index];
  }

  normalizeString(str: string): string {
    return str
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]/gi, "")
      .toLowerCase()
      .trim()
  }

  levenshtein(a: string, b: string): number {
    const m = a.length
    const n = b.length
    const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0))

    for (let i = 0; i <= m; i++) dp[i][0] = i
    for (let j = 0; j <= n; j++) dp[0][j] = j

    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        if (a[i - 1] === b[j - 1]) {
          dp[i][j] = dp[i - 1][j - 1]
        } else {
          dp[i][j] = 1 + Math.min(
            dp[i - 1][j],     // remoção
            dp[i][j - 1],     // inserção
            dp[i - 1][j - 1]  // substituição
          )
        }
      }
    }

    return dp[m][n]
  }

  isSimilar(a: string, b: string, threshold = 0.8): boolean {
    const normA = this.normalizeString(a)
    const normB = this.normalizeString(b)

    const maxLength = Math.max(normA.length, normB.length)
    if (maxLength === 0) return true // strings vazias = iguais

    const dist = this.levenshtein(normA, normB)
    const similarity = 1 - dist / maxLength

    return similarity >= threshold
  }

  async graduate( studentId: number | string, body: GraduateBody ) {

    let sqlConnection = await dbConn()

    try {

      let student: Student | null = null

      return await AppDataSource.transaction(async (CONN) => {

        const qUserTeacher = await this.qTeacherByUser(sqlConnection, body.user.user)

        const masterUser: boolean = qUserTeacher.person.category.id === pc.ADMN || qUserTeacher.person.category.id === pc.SUPE || qUserTeacher.person.category.id === pc.FORM;

        const { classrooms } = await this.qTeacherClassrooms(sqlConnection, body.user.user)

        const message = "Você não tem permissão para realizar modificações nesta sala de aula."
        if (!classrooms.includes(Number(body.student.classroom.id)) && !masterUser) { return { status: 403, message } }

        student = await CONN.findOne(Student, { where: { id: Number(studentId) } }) as Student

        if (!student) { return { status: 404, message: "Registro não encontrado" } }

        student.active = body.student.active; student.updatedAt = new Date(); student.updatedByUser = qUserTeacher.person.user.id;

        await CONN.save(Student, student)

        const status: TransferStatus = await CONN.findOne(TransferStatus, { where: { id: 6, name: "Formado" } }) as TransferStatus
        const year: Year = await CONN.findOne(Year, { where: { id: body.year } }) as Year
        const entity = { status, year, student, receiver: qUserTeacher, createdByUser: qUserTeacher.person.user.id, updatedByUser: qUserTeacher.person.user.id, startedAt: new Date(), endedAt: new Date(), requester: qUserTeacher, requestedClassroom: body.student.classroom, currentClassroom: body.student.classroom  }
        const transferResponse = await CONN.save(Transfer, entity)

        return { status: 201, data: transferResponse };
      })
    }
    catch (error: any) { return { status: 500, message: error.message } }
    finally { if(sqlConnection) { sqlConnection.release() } }
  }
}

export const stController = new StudentController();

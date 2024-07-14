import { StudentClassroom } from "./../model/StudentClassroom";
import { GenericController } from "./genericController";
import { Brackets, EntityManager, EntityTarget, In, IsNull } from "typeorm";
import { Student } from "../model/Student";
import { AppDataSource } from "../data-source";
import { PersonCategory } from "../model/PersonCategory";
import { pc } from "../utils/personCategories";
import { StudentDisability } from "../model/StudentDisability";
import { Disability } from "../model/Disability";
import { State } from "../model/State";
import { SaveStudent, StudentClassroomReturn, UserInterface } from "../interfaces/interfaces";
import { Person } from "../model/Person";
import { Request } from "express";
import { ISOWNER } from "../utils/owner";
import { Classroom } from "../model/Classroom";
import { Transfer } from "../model/Transfer";
import { TransferStatus } from "../model/TransferStatus";
import { Year } from "../model/Year";
import { Literacy } from "../model/Literacy";
import { LiteracyTier } from "../model/LiteracyTier";
import { LiteracyFirst } from "../model/LiteracyFirst";
import { LiteracyLevel } from "../model/LiteracyLevel";
import { TextGenderExam } from "../model/TextGenderExam";
import { TextGenderExamTier } from "../model/TextGenderExamTier";
import { TextGenderClassroom } from "../model/TextGenderClassroom";
import { TextGenderGrade } from "../model/TextGenderGrade";
import { disabilityController } from "./disability";
import { stateController } from "./state";
import { teacherClassroomsController } from "./teacherClassrooms";
import { Teacher } from "../model/Teacher";
import getTimeZone from "../utils/getTimeZone";

interface GraduateBody  { user: UserInterface; student: { id: number; active: boolean; classroom: Classroom }; year: number }
interface InactiveNewClassroom { student: Student; oldYear: number; newClassroom: { id: number; name: string; school: string }; oldClassroom: { id: number; name: string; school: string }; user: { user: number; username: string; category: number } }
interface LiteracyBeforeLevel { user: { user: number; username: string; category: number; iat: number; exp: number }; studentClassroom: StudentClassroom; literacyLevel: LiteracyLevel }
interface StudentClassroomFnOptions { search?: string; year?: string; teacherClasses?: { id: number; classrooms: number[] }; owner?: string }

class StudentController extends GenericController<EntityTarget<Student>> {

  constructor() { super(Student) }

  async studentForm(req: Request) {

    try {

      return await AppDataSource.transaction(async(CONN) => {

        const states = (await stateController.findAllWhere({}, req, CONN)).data;
        const disabilities = (await disabilityController.findAllWhere({}, req, CONN)).data;
        const teacherClassrooms = (await teacherClassroomsController.getAllTClass(req, CONN)).data;

        return { status: 200, data: { disabilities, states, teacherClassrooms } };
      })
    } catch (error: any) { return { status: 500, message: error.message } }
  }

  async getAllInactivates(request: Request) {

    try {

      return AppDataSource.transaction(async(CONN) => {

        const currentYear = await this.currentYear(CONN)

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
          .andWhere( new Brackets((qb) => { qb.where("person.name LIKE :search", { search: `%${ request.query.search} %` }).orWhere("student.ra LIKE :search", { search: `%${ request.query.search }%` })}))
          .andWhere("year.name = :yearName", { yearName: request.params.year })
          .andWhere((qb) => { const subQueryNoCurrentYear = qb.subQuery().select("1").from("student_classroom", "sc1").where("sc1.studentId = student.id").andWhere("sc1.yearId = :currentYearId", { currentYearId: currentYear.id }).andWhere("sc1.endedAt IS NULL").getQuery(); return `NOT EXISTS ${subQueryNoCurrentYear}` })
          .andWhere((qb) => { const subQueryLastYearOrOlder = qb.subQuery().select("MAX(sc2.endedAt)").from("student_classroom", "sc2").where("sc2.studentId = student.id").andWhere("sc2.yearId <= :lastYearId", { lastYearId: lastYearDB.id }).getQuery(); return `studentClassroom.endedAt = (${subQueryLastYearOrOlder})` })
          .orderBy("person.name", "ASC")
          .getMany();

        return { status: 200, data: preResult.map((student) => ({ ...student, studentClassrooms: this.getOneClassroom(student.studentClassrooms) }))};
      })
    } catch (error: any) { return { status: 500, message: error.message } }
  }

  async inactiveNewClass(body: InactiveNewClassroom) {

    // TODO: implementar verificação se há mudança de sala para o mesmo classroomNumber e mesmo ano.

    const { student, oldYear, newClassroom, oldClassroom, user } = body;

    try {

      let errMessage: string = ''

      return await AppDataSource.transaction(async (CONN) => {

        const currentYear = await this.currentYear(CONN)

        errMessage = "Não existe um ano letivo ativo. Entre em contato com o Administrador do sistema."
        if (!currentYear) { return { status: 404, message: errMessage }}

        const uTeacher = await this.teacherByUser(user.user, CONN);
        const activeStuClass = await CONN.findOne(StudentClassroom, {relations: ["classroom.school", "student.person", "year"], where: { student: { id: student.id }, endedAt: IsNull() } }) as StudentClassroom

        errMessage = `O aluno ${activeStuClass.student.person.name} está matriculado na sala ${activeStuClass.classroom.shortName} ${activeStuClass.classroom.school.shortName} em ${activeStuClass.year.name}. Solicite sua transferência através do menu Matrículas Ativas`
        if (activeStuClass) { return { status: 409, message: errMessage }}

        const lastYearName = Number(currentYear.name) - 1;
        const lastYearDB = await CONN.findOne(Year, { where: { name: lastYearName.toString() } })
        const oldYearDB = await CONN.findOne(Year, { where: { id: oldYear } })

        if (!lastYearDB) { return { status: 404, message: "Não foi possível encontrar o ano letivo anterior." }}
        if (!oldYearDB) { return { status: 404, message: "Não foi possível encontrar o ano letivo informado." }}

        const lastReg = await CONN.getRepository(Student)
          .createQueryBuilder("student")
          .leftJoinAndSelect("student.person", "person")
          .leftJoinAndSelect("student.state", "state")
          .leftJoinAndSelect("student.studentClassrooms", "studentClassroom")
          .leftJoinAndSelect("studentClassroom.classroom", "classroom")
          .leftJoinAndSelect("classroom.school", "school")
          .leftJoinAndSelect("studentClassroom.year", "year")
          .where("studentClassroom.endedAt IS NOT NULL")
          .andWhere("student.id = :studentId", { studentId: student.id })
          .andWhere("year.id = :yearId", { yearId: lastYearDB.id })
          .andWhere((qb) => { const subQueryMaxEndedAt = qb.subQuery().select("MAX(sc2.endedAt)").from("student_classroom", "sc2").where("sc2.studentId = student.id").andWhere("sc2.yearId = :yearId", { yearId: lastYearDB.id }).getQuery(); return `studentClassroom.endedAt = (${subQueryMaxEndedAt})` })
          .getOne();

        if ( lastReg && lastReg?.studentClassrooms.length > 0 && Number(currentYear.name) - Number(oldYearDB.name) > 1 ) {
          errMessage = `Matrícula encerrada para ${lastReg.person.name} no ano de: ${lastYearDB.name}. Acesse o ano ${lastYearDB.name} em Passar de Ano e faça a transfêrencia.`
          return { status: 409, message: errMessage }
        }

        const clssrm = await CONN.findOne(Classroom, { where: { id: newClassroom.id } }) as Classroom
        const oldClassInBase = await CONN.findOne(Classroom, { where: { id: oldClassroom.id } }) as Classroom

        const notDigit = /\D/g;
        errMessage = "Regressão de sala não é permitido."
        if (Number(clssrm.name.replace(notDigit, "")) < Number(oldClassInBase.name.replace(notDigit, ""))) { return { status: 400, message: errMessage }}

        let newStuClass: StudentClassroom | null = null;

        const stuClassroom = { student: student, classroom: clssrm, year: currentYear, rosterNumber: 99, startedAt: new Date(), createdByUser: uTeacher.person.user.id } as StudentClassroom
        newStuClass = await CONN.save(StudentClassroom, stuClassroom)

        const classroomNumber = Number(clssrm.shortName.replace(notDigit, ""));

        if (classroomNumber >= 1 && classroomNumber <= 3) {
          const literacyTier = await CONN.find(LiteracyTier)
          for (let tier of literacyTier) { await CONN.save(Literacy, { studentClassroom: newStuClass, literacyTier: tier, createdByUser: uTeacher.person.user.id, createdAt: new Date() })}
        }

        if (classroomNumber === 4 || classroomNumber === 5) {
          const tgExam = await CONN.find(TextGenderExam)
          const tgExamTier = await CONN.find(TextGenderExamTier)
          const tgClassroom = await CONN.find(TextGenderClassroom, { where: { classroomNumber: classroomNumber }, relations: ["textGender"]})

          for (let tg of tgClassroom) {
            for (let tier of tgExamTier) {
              for (let exam of tgExam) {

                const el = new TextGenderGrade();
                el.studentClassroom = newStuClass;
                el.textGender = tg.textGender;
                el.textGenderExam = exam;
                el.textGenderExamTier = tier;
                el.createdAt = new Date();
                el.createdByUser = uTeacher.person.user.id;

                await CONN.save(TextGenderGrade, { ...el })

              }
            }
          }
        }

        const status = await CONN.findOne(TransferStatus, { where: { id: 1, name: "Aceitada" }}) as TransferStatus
        const transfer = { startedAt: new Date(), endedAt: new Date(), requester: uTeacher, requestedClassroom: clssrm, currentClassroom: oldClassInBase, receiver: uTeacher, student: student, status, year: currentYear, createdByUser: uTeacher.person.user.id, updatedByUser: uTeacher.person.user.id } as Transfer

        await CONN.save(Transfer, transfer);

        return { status: 200, data: newStuClass };
      })
    } catch (error: any) { return { status: 500, message: error.message } }
  }

  async allStudents(req: Request) {

    try {

      return await AppDataSource.transaction(async(CONN) => {
        const teacher = await this.teacherByUser(req.body.user.user, CONN);
        const teacherClasses = await this.teacherClassrooms(req?.body.user, CONN);
        const studentsClassrooms = await this.studentsClassrooms({ search: req.query.search as string, year: req.params.year, teacherClasses, owner: req.query.owner as string }, teacher.person.category.id === pc.ADMN || teacher.person.category.id === pc.SUPE )
        return { status: 200, data: studentsClassrooms }
      })

    } catch (error: any) { return { status: 500, message: error.message } }
  }

  async findOneStudentById(req: Request) {

    const { params, body } = req

    try {
      return await AppDataSource.transaction(async(CONN) => {

        const options = { relations: ["person.category"], where: { person: { user: { id: body?.user.user } } } }
        const uTeacher = await CONN.findOne(Teacher, {...options})

        const masterUser = uTeacher?.person.category.id === pc.ADMN || uTeacher?.person.category.id === pc.SUPE
        const teacherClasses = await this.teacherClassrooms(body?.user, CONN)
        const preStudent = await this.student(Number(params.id), CONN)

        if (!preStudent) { return { status: 404, message: "Registro não encontrado" } }

        const data = this.formartStudentResponse(preStudent)

        if (teacherClasses.classrooms.length > 0 && !teacherClasses.classrooms.includes(data.classroom.id) && !masterUser ) { return { status: 403, message: "Você não tem permissão para acessar esse registro." } }
        return { status: 200, data }
      })
    } catch (error: any) { return { status: 500, message: error.message } }
  }

  override async save(body: SaveStudent) {
    try {

      return await AppDataSource.transaction(async (CONN) => {

        const uTeacher = await this.teacherByUser(body.user.user, CONN);
        const tClasses = await this.teacherClassrooms(body.user, CONN);
        const year = await this.currentYear(CONN);
        const state = await this.state(body.state, CONN);
        const classroom = await this.classroom(body.classroom, CONN);
        const category = await this.studentCategory(CONN);
        const disabilities = await this.disabilities(body.disabilities, CONN);
        const person = this.createPerson({ name: body.name, birth: body.birth, category });

        if (!year) { return { status: 404, message: "Não existe um ano letivo ativo. Entre em contato com o Administrador do sistema." } }

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

          const message = `RA existente. ${el.person.name} se formou em: ${preR?.classroom.shortName} ${preR?.classroom.school.shortName} no ano de ${preR?.year.name}.`
          if (!el.active) { return { status: 409, message }}

          return { status: 409, message: `Já existe um aluno com o RA informado. ${el.person.name} tem como último registro: ${preR?.classroom.shortName} ${preR?.classroom.school.shortName} no ano ${preR?.year.name}. ${preR.endedAt === null ? `Acesse o menu MATRÍCULAS ATIVAS no ano de ${preR.year.name}.` : `Acesse o menu PASSAR DE ANO no ano de ${preR.year.name}.`}`};
        }

        const message = "Você não tem permissão para criar um aluno nesta sala."
        if (body.user.category === pc.PROF) { if (!tClasses.classrooms.includes(classroom.id)) { return { status: 403, message }}}

        let student: Student | null = null;

        student = await CONN.save(Student, this.createStudent(body, person, state, uTeacher.person.user.id));

        if (!!disabilities.length) {
          const mappDis = disabilities.map((disability) => { return { student: student as Student, startedAt: new Date(), disability, createdByUser: uTeacher.person.user.id } as StudentDisability })
          await CONN.save(StudentDisability, mappDis);
        }

        const stClassroom = await CONN.find(StudentClassroom, { relations: ["classroom", "year"], where: { year: { id: year.id }, classroom: { id: classroom.id } }, order: { rosterNumber: "DESC" }, take: 1 });

        let last = 1; if (stClassroom[0]?.rosterNumber) { last = stClassroom[0].rosterNumber + 1 };

        const stObject = (await CONN.save(StudentClassroom, { student, classroom, year, rosterNumber: last, startedAt: new Date(), createdByUser: uTeacher.person.user.id })) as StudentClassroom;

        const notDigit = /\D/g; const classroomNumber = Number(stObject.classroom.shortName.replace(notDigit, ""));

        const tStatus = (await CONN.findOne(TransferStatus, { where: { id: 5, name: "Novo" }})) as TransferStatus;

        const transfer = { startedAt: new Date(), endedAt: new Date(), requester: uTeacher, requestedClassroom: classroom, currentClassroom: classroom, receiver: uTeacher, student, status: tStatus, createdByUser: uTeacher.person.user.id, year: await this.currentYear(CONN) } as Transfer

        await CONN.save(Transfer, transfer);

        if (classroomNumber >= 1 && classroomNumber <= 3) {
          const literacyTier = await CONN.find(LiteracyTier)
          for (let tier of literacyTier) { await CONN.save(Literacy, { studentClassroom: stObject, literacyTier: tier, createdByUser: uTeacher.person.user.id, createdAt: new Date() } as Literacy) }
          await CONN.save(LiteracyFirst,{ student, createdAt: new Date(), createdByUser: uTeacher.person.user.id  })
        }

        if (classroomNumber === 4 || classroomNumber === 5) {

          const tgExam = await CONN.find(TextGenderExam);
          const tgExamTier = await CONN.find(TextGenderExamTier);
          const tgClassroom = await CONN.find(TextGenderClassroom, { where: { classroomNumber: classroomNumber }, relations: ["textGender"] });

          for (let tg of tgClassroom) { for (let tier of tgExamTier) { for (let exam of tgExam) { await CONN.save(TextGenderGrade, { studentClassroom: stObject, textGender: tg.textGender, textGenderExam: exam, textGenderExamTier: tier, createdAt: new Date(), createdByUser: uTeacher.person.user.id })}}}
        }
        return { status: 201, data: student as unknown as Student }
      })
    } catch (error: any) { return { status: 500, message: error.message } }
  }

  async putLiteracyBeforeLevel(body: LiteracyBeforeLevel) {
    try {
      return await AppDataSource.transaction(async (CONN) => {

        const uTeacher = await this.teacherByUser(body.user.user);

        const classroomNumber = Number(body.studentClassroom.classroom.shortName.replace(/\D/g, ""))

        const register = await CONN.findOne(LiteracyFirst, { relations: ["literacyLevel"], where: { student: { id: body.studentClassroom.student.id } }})

        if (!register) { return { status: 404, message: "Registro não encontrado" } }

        if (classroomNumber >= 1 && classroomNumber <= 3 && register && register.literacyLevel === null) {

          register.literacyLevel = body.literacyLevel
          register.updatedAt = new Date()
          register.updatedByUser = uTeacher.person.user.id

          await CONN.save(LiteracyFirst, register)
          return { status: 201, data: {} }
        }
        return { status: 201, data: {} }
      })
    } catch (error: any) { return { status: 500, message: error.message } }
  }

  override async updateId(studentId: number | string, body: any) {

    try {

      let result: any;

      return await AppDataSource.transaction(async (CONN) => {

        const uTeacher = await this.teacherByUser(body.user.user, CONN);

        const dbStudent = await CONN.findOne(Student, { relations: ["person", "studentDisabilities.disability", "state"], where: { id: Number(studentId) } }) as Student;

        const bodyClass = await CONN.findOne(Classroom, { where: { id: body.classroom } });

        const arrRel = ["student", "classroom", "literacies.literacyTier", "literacies.literacyLevel", "textGenderGrades.textGender", "textGenderGrades.textGenderExam", "textGenderGrades.textGenderExamTier", "textGenderGrades.textGenderExamLevel", "year" ];

        const stClass = await CONN.findOne(StudentClassroom, { relations: arrRel, where: { id: Number(body.currentStudentClassroomId), student: { id: dbStudent.id }, endedAt: IsNull() } })

        if (!dbStudent) { return { status: 404, message: "Registro não encontrado" } }
        if (!stClass) { return { status: 404, message: "Registro não encontrado" } }
        if (!bodyClass) { return { status: 404, message: "Sala não encontrada" } }

        const cBodySRA = `${body.ra}${body.dv}`; const cSRA = `${dbStudent.ra}${dbStudent.dv}`;

        if (cSRA !== cBodySRA) { const exists = await CONN.findOne(Student, { where: { ra: body.ra, dv: body.dv } }); if (exists) { return { status: 409, message: "Já existe um aluno com esse RA" } }}

        const canChange = [ pc.ADMN, pc.SUPE, pc.DIRE, pc.VICE, pc.COOR, pc.SECR ]

        const message = "Você não tem permissão para alterar a sala de um aluno por aqui. Crie uma solicitação de transferência no menu ALUNOS na opção OUTROS ATIVOS."
        if (!canChange.includes(uTeacher.person.category.id) && stClass?.classroom.id != bodyClass.id ) { return { status: 403, message } }

        if (stClass?.classroom.id != bodyClass.id && canChange.includes(uTeacher.person.category.id)) {

          const newNumber = Number(bodyClass.shortName.replace(/\D/g, ""));
          const oldNumber = Number(stClass.classroom.shortName.replace(/\D/g, ""));

          if (newNumber < oldNumber) { return { status: 404, message: "Não é possível alterar a sala para uma sala com número menor que a atual." }}

          await CONN.save(StudentClassroom, { ...stClass, endedAt: new Date(), updatedByUser: uTeacher.person.user.id });

          const currentYear = (await CONN.findOne(Year, { where: { endedAt: IsNull(), active: true } })) as Year

          const lastRosterNumber = await CONN.find(StudentClassroom, { relations: ["classroom", "year"], where: { year: { id: currentYear.id }, classroom: { id: bodyClass.id } }, order: { rosterNumber: "DESC" }, take: 1 });

          let last = 1; if (lastRosterNumber[0]?.rosterNumber) { last = lastRosterNumber[0].rosterNumber + 1 };

          const newStClass = await CONN.save(StudentClassroom, { student: dbStudent, classroom: bodyClass, year: currentYear, rosterNumber: last, startedAt: new Date(), createdByUser: uTeacher.person.user.id });

          const notDigit = /\D/g; const classNumber = Number( bodyClass.shortName.replace(notDigit, "") );

          if (classNumber >= 1 && classNumber <= 3) {

            const literacyTier = await CONN.find(LiteracyTier);

            if (stClass.classroom.id != newStClass.classroom.id && oldNumber === newNumber && stClass.year.id === newStClass.year.id ) {
              for (let tier of literacyTier) {
                const literacy = stClass.literacies.find((el) => el.literacyTier.id === tier.id && el.literacyLevel != null )

                if (literacy) { await CONN.save(Literacy, { studentClassroom: newStClass, literacyTier: literacy.literacyTier, literacyLevel: literacy.literacyLevel, toRate: false, createdAt: new Date(), createdByUser: uTeacher.person.user.id })}
                else { await CONN.save(Literacy, { studentClassroom: newStClass, literacyTier: tier, createdAt: new Date(), createdByUser: uTeacher.person.user.id }) }
              }
            }
            else { for (let tier of literacyTier) { await CONN.save(Literacy, { studentClassroom: newStClass, literacyTier: tier, createdAt: new Date(), createdByUser: uTeacher.person.user.id })}}
          }

          if (classNumber === 4 || classNumber === 5) {

            const tgExam = await CONN.find(TextGenderExam);
            const tgExamTier = await CONN.find(TextGenderExamTier);
            const tgClassroom = await CONN.find(TextGenderClassroom, { where: { classroomNumber: classNumber }, relations: ["textGender"] } );

            if (stClass.classroom.id != newStClass.classroom.id && oldNumber === newNumber && stClass.year.id === newStClass.year.id ) {
              for (let tg of tgClassroom) { for (let tier of tgExamTier) { for (let exam of tgExam) {
                const textGenderGrade = stClass.textGenderGrades.find((el) => el.textGender.id === tg.textGender.id && el.textGenderExam.id === exam.id && el.textGenderExamTier.id === tier.id && el.textGenderExamLevel != null );
                if (textGenderGrade) { await CONN.save(TextGenderGrade, { createdAt: new Date(), createdByUser: uTeacher.person.user.id, studentClassroom: newStClass, textGender: textGenderGrade.textGender, textGenderExam: textGenderGrade.textGenderExam, textGenderExamTier: textGenderGrade.textGenderExamTier, textGenderExamLevel: textGenderGrade.textGenderExamLevel, toRate: false } as TextGenderGrade)}
                else { await CONN.save(TextGenderGrade, { studentClassroom: newStClass, textGender: tg.textGender, textGenderExam: exam, textGenderExamTier: tier })}
              }}}
            }
            else {
              for (let tg of tgClassroom) { for (let tier of tgExamTier) { for (let exam of tgExam) {
                await CONN.save(TextGenderGrade, { createdAt: new Date(), createdByUser: uTeacher.person.user.id, studentClassroom: newStClass, textGender: tg.textGender, textGenderExam: exam, textGenderExamTier: tier } as TextGenderGrade )
              }}}
            }
          }

          const trfr = new Transfer();
          trfr.createdByUser = uTeacher.person.user.id;
          trfr.startedAt = new Date();
          trfr.endedAt = new Date();
          trfr.requester = uTeacher;
          trfr.requestedClassroom = bodyClass;
          trfr.currentClassroom = stClass.classroom;
          trfr.receiver = uTeacher;
          trfr.student = dbStudent;
          trfr.status = (await CONN.findOne(TransferStatus, {where: {id: 1,name: "Aceitada" }})) as TransferStatus;
          trfr.year = await CONN.findOne(Year, { where: { endedAt: IsNull(), active: true } }) as Year

          await CONN.save(Transfer, trfr);
        }

        if (stClass.classroom.id === bodyClass.id) { await CONN.save(StudentClassroom, {...stClass, rosterNumber: body.rosterNumber, createdAt: new Date(), createdByUser: uTeacher.person.user.id } as StudentClassroom )}

        dbStudent.ra = body.ra;
        dbStudent.dv = body.dv;
        dbStudent.updatedAt = new Date();
        dbStudent.updatedByUser = uTeacher.person.user.id;
        dbStudent.person.name = body.name;
        dbStudent.person.birth = body.birth;
        dbStudent.observationOne = body.observationOne;
        dbStudent.observationTwo = body.observationTwo;
        dbStudent.state = await CONN.findOne(State, { where: { id: body.state } }) as State;

        const stDisabilities = dbStudent.studentDisabilities.filter((studentDisability) => !studentDisability.endedAt);

        await this.setDisabilities(uTeacher.person.user.id, await CONN.save(Student, dbStudent), stDisabilities, body.disabilities, CONN);

        result = this.formartStudentResponse(await this.student(Number(studentId), CONN));

        return { status: 200, data: result };
      })
    } catch (error: any) { return { status: 500, message: error.message } }
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

  async studentsClassrooms(options: StudentClassroomFnOptions, masterUser: boolean) {

    return await AppDataSource.transaction(async(CONN) => {

      const isOwner = options.owner === ISOWNER.OWNER;
      const yearName = options.year ?? (await this.currentYear(CONN)).name;

      let allClassrooms: Classroom[] = [];

      if (masterUser) { allClassrooms = (await CONN.find(Classroom)) }

      const result = await CONN.createQueryBuilder()
        .select(["studentClassroom.id", "studentClassroom.rosterNumber", "studentClassroom.startedAt", "studentClassroom.endedAt", "student.id", "student.ra", "student.dv", "state.id", "state.acronym", "person.id", "person.name", "person.birth", "classroom.id", "classroom.shortName", "school.id", "school.shortName", "transfers.id", "transfers.startedAt", "requesterPerson.name", "transfersStatus.name" ])
        .from(Student, "student")
        .leftJoin("student.person", "person")
        .leftJoin("student.state", "state")
        .leftJoin("student.transfers", "transfers", "transfers.endedAt IS NULL")
        .leftJoin("transfers.status", "transfersStatus")
        .leftJoin("transfers.requester", "requester")
        .leftJoin("requester.person", "requesterPerson")
        .leftJoin("student.studentClassrooms", "studentClassroom", "studentClassroom.endedAt IS NULL")
        .leftJoin("studentClassroom.classroom", "classroom")
        .leftJoin("classroom.school", "school")
        .leftJoin("studentClassroom.year", "year")
        .where("year.name = :yearName", { yearName })
        .andWhere( new Brackets((qb) => { qb.where("person.name LIKE :search", { search: `%${options.search}%` }).orWhere("student.ra LIKE :search", { search: `%${options.search}%` }) }))
        .andWhere( new Brackets((qb) => { if (!masterUser) { qb.andWhere(isOwner ? "classroom.id IN (:...classrooms)" : "classroom.id NOT IN (:...classrooms)", { classrooms: options.teacherClasses?.classrooms } ) } else { qb.andWhere( isOwner ? "classroom.id IN (:...classrooms)" : "classroom.id NOT IN (:...classrooms)", { classrooms: allClassrooms.map((classroom) => classroom.id)})}}))
        .orderBy("school.shortName", "ASC")
        .addOrderBy("classroom.shortName", "ASC")
        .addOrderBy("person.name", "ASC")
        .getRawMany();

      return result.map((item) => {
        return {
          id: item.studentClassroom_id,
          rosterNumber: item.studentClassroom_rosterNumber,
          startedAt: item.studentClassroom_startedAt,
          endedAt: item.studentClassroom_endedAt,
          classroom: { id: item.classroom_id, shortName: item.classroom_shortName, teacher: options.teacherClasses, school: { id: item.school_id, shortName: item.school_shortName } },
          student: {
            id: item.student_id,
            ra: item.student_ra,
            dv: item.student_dv,
            state: { id: item.state_id, acronym: item.state_acronym },
            person: { id: item.person_id, name: item.person_name, birth: item.person_birth },
            transfer: item.transfers_id ? { id: item.transfers_id, startedAt: item.transfers_startedAt, status: { name: item.transfersStatus_name }, requester: { name: item.requesterPerson_name } } : false,
          },
        }
      }) as StudentClassroomReturn[]
    })
  }

  createStudent(body: SaveStudent, person: Person, state: State, userId: number) {
    const student = new Student();
    student.person = person;
    student.ra = body.ra;
    student.dv = body.dv;
    student.state = state;
    student.createdByUser = userId,
    student.createdAt = new Date()
    student.observationOne = body.observationOne;
    student.observationTwo = body.observationTwo;
    return student;
  }

  formartStudentResponse(student: any) {
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

  getOneClassroom(studentClassrooms: StudentClassroom[]) {
    const maxEndedAtIndex = studentClassrooms.findIndex(
      (sc) =>
        getTimeZone(sc.endedAt) ===
        Math.max(...studentClassrooms.map((sc) => getTimeZone(sc.endedAt))),
    );
    return studentClassrooms[maxEndedAtIndex];
  }

  async graduate( studentId: number | string, body: GraduateBody ) {

    try {

      let student: Student | null = null

      return await AppDataSource.transaction(async (CONN) => {

        const uTeacher = await CONN.findOne(Teacher, { relations: ["person.category"], where: { person: { user: { id: body.user.user } } } }) as Teacher
        const masterUser = uTeacher.person.category.id === pc.ADMN || uTeacher.person.category.id === pc.SUPE;

        const { classrooms } = await this.teacherClassrooms(body.user, CONN);
        if (!classrooms.includes(Number(body.student.classroom.id)) && !masterUser) { return { status: 403, message: "Você não tem permissão para realizar modificações nesta sala de aula." } }

        student = await CONN.findOne(Student, { where: { id: Number(studentId) } }) as Student;

        if (!student) { return { status: 404, message: "Registro não encontrado" } }

        student.active = body.student.active;
        student.updatedAt = new Date();
        student.updatedByUser = uTeacher.person.user.id;

        await CONN.save(Student, student);

        const status = await CONN.findOne(TransferStatus, { where: { id: 6, name: "Formado" } }) as TransferStatus
        const year = await CONN.findOne(Year, { where: { id: body.year } }) as Year
        const transferResponse = await CONN.save(Transfer, { status, year, student, receiver: uTeacher, createdByUser: uTeacher.person.user.id, updatedByUser: uTeacher.person.user.id, startedAt: new Date(), endedAt: new Date(), requester: uTeacher, requestedClassroom: body.student.classroom, currentClassroom: body.student.classroom  })

        return { status: 201, data: transferResponse };
      })
    } catch (error: any) { return { status: 500, message: error.message } }
  }
}

export const stController = new StudentController();

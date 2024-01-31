import { StudentClassroom } from './../model/StudentClassroom';
import { GenericController } from "./genericController";
import { Brackets, EntityTarget, FindManyOptions, In, IsNull, Not, ObjectLiteral } from "typeorm";
import { Student } from "../model/Student";
import { AppDataSource } from "../data-source";
import { PersonCategory } from "../model/PersonCategory";
import { personCategories } from "../utils/personCategories";
import { StudentDisability } from "../model/StudentDisability";
import { Disability } from "../model/Disability";
import { State } from "../model/State";
import { StudentClassroom } from "../model/StudentClassroom";
import { SaveStudent, StudentClassroomReturn, UserInterface } from "../interfaces/interfaces";
import { Person } from "../model/Person";
import { Request } from "express";
import { ISOWNER } from "../utils/owner";
import { Classroom } from "../model/Classroom";
import { Transfer } from "../model/Transfer";
import { TransferStatus } from "../model/TransferStatus";
import getTimeZone from "../utils/getTimeZone";
import { Year } from "../model/Year";
import { Literacy } from "../model/Literacy";
import { LiteracyTier } from "../model/LiteracyTier";
import { LiteracyFirst } from "../model/LiteracyFirst";
import { LiteracyLevel } from "../model/LiteracyLevel";
import { TextGenderExam } from "../model/TextGenderExam";
import { TextGenderExamTier } from "../model/TextGenderExamTier";
import { TextGenderClassroom } from "../model/TextGenderClassroom";
import { TextGenderGrade } from "../model/TextGenderGrade";

class StudentController extends GenericController<EntityTarget<Student>> {
  constructor() { super(Student) }

  async getAllInactivates(request?: Request) {

    const yearName = request?.params.year
    const search = request?.query.search

    try {

      const currentYear = await this.currentYear();
      if (!currentYear) { return { status: 404, message: 'Não existe um ano letivo ativo. Entre em contato com o Administrador do sistema.' } }

      const lastYearName = Number(currentYear.name) - 1;
      const lastYearDB = await AppDataSource.getRepository(Year).findOne({ where: { name: lastYearName.toString() } }) as Year;

      if (!lastYearDB) { return { status: 404, message: `Não existe ano letivo anterior ou posterior a ${currentYear.name}.` } }

      const preResult = await AppDataSource.getRepository(Student)
        .createQueryBuilder('student')
        .leftJoinAndSelect('student.person', 'person')
        .leftJoinAndSelect('student.state', 'state')
        .leftJoinAndSelect('student.studentClassrooms', 'studentClassroom')
        .leftJoinAndSelect('studentClassroom.classroom', 'classroom')
        .leftJoinAndSelect('classroom.school', 'school')
        .leftJoinAndSelect('studentClassroom.year', 'year')
        .where('studentClassroom.endedAt IS NOT NULL')
        .andWhere('student.active = 1')
        .andWhere(new Brackets(qb => {
          qb.where('person.name LIKE :search', { search: `%${search}%` })
            .orWhere('student.ra LIKE :search', { search: `%${search}%` });
        }))
        .andWhere('year.name = :yearName', { yearName })
        .andWhere(qb => {
          const subQueryNoCurrentYear = qb
            .subQuery()
            .select('1')
            .from('student_classroom', 'sc1')
            .where('sc1.studentId = student.id')
            .andWhere('sc1.yearId = :currentYearId', { currentYearId: currentYear.id })
            .andWhere('sc1.endedAt IS NULL')
            .getQuery();

          return `NOT EXISTS ${subQueryNoCurrentYear}`;
        })
        .andWhere(qb => {
          const subQueryLastYearOrOlder = qb
            .subQuery()
            .select('MAX(sc2.endedAt)')
            .from('student_classroom', 'sc2')
            .where('sc2.studentId = student.id')
            .andWhere('sc2.yearId <= :lastYearId', { lastYearId: lastYearDB.id })
            .getQuery();

          return `studentClassroom.endedAt = (${subQueryLastYearOrOlder})`;
        })
        .orderBy('person.name', 'ASC')
        .getMany();

      const result = preResult.map(student => ({ ...student, studentClassrooms: this.getOneClassroom(student.studentClassrooms) }))

      return { status: 200, data: result };

    } catch (error: any) { return { status: 500, message: error.message } }
  }

  async setInactiveNewClassroom(body: { student: Student, oldYear: number, newClassroom: { id: number, name: string, school: string }, oldClassroom: { id: number, name: string, school: string }, user: { user: number, username: string, category: number } }) {

    // TODO: implementar verificação se há mudança de sala para o mesmo classroomNumber e mesmo ano.

    const { student, oldYear, newClassroom, oldClassroom, user } = body

    try {

      const currentYear = await this.currentYear()
      if (!currentYear) { return { status: 404, message: 'Não existe um ano letivo ativo. Entre em contato com o Administrador do sistema.' } }

      const teacher = await this.teacherByUser(user.user)

      const activeStudentClassroom = await AppDataSource.getRepository(StudentClassroom).findOne({
        relations: ['classroom.school', 'student.person', 'year'],
        where: { student: { id: student.id }, endedAt: IsNull() }
      }) as StudentClassroom

      if (activeStudentClassroom) { return { status: 409, message: `O aluno ${activeStudentClassroom.student.person.name} está matriculado na sala ${activeStudentClassroom.classroom.shortName} ${activeStudentClassroom.classroom.school.shortName} em ${activeStudentClassroom.year.name}. Solicite sua transferência através do menu Matrículas Ativas` } }

      const lastYearName = Number(currentYear.name) - 1
      const lastYearDB = await AppDataSource.getRepository(Year).findOne({ where: { name: lastYearName.toString() } }) as Year
      const oldYearDB = await AppDataSource.getRepository(Year).findOne({ where: { id: oldYear } }) as Year

      if (!lastYearDB) { return { status: 404, message: 'Não foi possível encontrar o ano letivo anterior.' } }
      if (!oldYearDB) { return { status: 404, message: 'Não foi possível encontrar o ano letivo informado.' } }

      const lastYearStudentClassroom = await AppDataSource.getRepository(Student)
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

      if (lastYearStudentClassroom && lastYearStudentClassroom?.studentClassrooms.length > 0 && Number(currentYear.name) - Number(oldYearDB.name) > 1) { return { status: 409, message: `O aluno ${lastYearStudentClassroom.person.name} possui matrícula encerrada para o ano letivo de ${lastYearDB.name}. Acesse o ano letivo ${lastYearDB.name} em Passar de Ano e faça a transfêrencia.` } }

      const classroom = await AppDataSource.getRepository(Classroom).findOne({ where: { id: newClassroom.id } }) as Classroom
      const oldClassroomInDatabase = await AppDataSource.getRepository(Classroom).findOne({ where: { id: oldClassroom.id } }) as Classroom

      const notDigit = /\D/g
      if (Number(classroom.name.replace(notDigit, '')) < Number(oldClassroomInDatabase.name.replace(notDigit, ''))) {
        return { status: 400, message: 'Regressão de sala não é permitido.' }
      }

      const newStudentClassroom = await AppDataSource.getRepository(StudentClassroom).save({
        student: student,
        classroom: classroom,
        year: currentYear,
        rosterNumber: 99,
        startedAt: new Date()
      }) as StudentClassroom

      const classroomNumber = Number(classroom.shortName.replace(notDigit, ''))

      if (classroomNumber >= 1 && classroomNumber <= 3) {
        const literacyTier = await AppDataSource.getRepository(LiteracyTier).find() as LiteracyTier[]

        for (let tier of literacyTier) {

          await AppDataSource.getRepository(Literacy).save({
            studentClassroom: newStudentClassroom,
            literacyTier: tier
          })
        }
      }

      if (classroomNumber === 4 || classroomNumber === 5) {
        const textGenderExam = await AppDataSource.getRepository(TextGenderExam).find() as TextGenderExam[]
        const textGenderExamTier = await AppDataSource.getRepository(TextGenderExamTier).find() as TextGenderExamTier[]

        const textGenderClassroom = await AppDataSource.getRepository(TextGenderClassroom).find({
          where: { classroomNumber: classroomNumber },
          relations: ['textGender']
        }) as TextGenderClassroom[]

        for (let tg of textGenderClassroom) {
          for (let tier of textGenderExamTier) {
            for (let exam of textGenderExam) {
              const textGenderGrade = new TextGenderGrade()
              textGenderGrade.studentClassroom = newStudentClassroom
              textGenderGrade.textGender = tg.textGender
              textGenderGrade.textGenderExam = exam
              textGenderGrade.textGenderExamTier = tier

              await AppDataSource.getRepository(TextGenderGrade).save(textGenderGrade)
            }
          }
        }
      }

      await AppDataSource.getRepository(Transfer).save({
        startedAt: new Date(),
        endedAt: new Date(),
        requester: teacher,
        requestedClassroom: classroom,
        currentClassroom: oldClassroomInDatabase,
        receiver: teacher,
        student: student,
        status: await AppDataSource.getRepository(TransferStatus).findOne({ where: { id: 1, name: 'Aceitada' } }) as TransferStatus,
        year: currentYear
      })

      return { status: 200, data: newStudentClassroom };
    } catch (error: any) { return { status: 500, message: error.message } }
  }

  override async findAllWhere(options: FindManyOptions<ObjectLiteral> | undefined, request?: Request) {

    const owner = request?.query.owner as string
    const search = request?.query.search as string
    const year = request?.params.year as string

    try {
      const teacher = await this.teacherByUser(request?.body.user.user)
      const teacherClasses = await this.teacherClassrooms(request?.body.user)
      const isAdminSupervisor = teacher.person.category.id === personCategories.ADMINISTRADOR || teacher.person.category.id === personCategories.SUPERVISOR
      const studentsClassrooms = await this.studentsClassrooms({ search, year, teacherClasses, owner }, isAdminSupervisor) as StudentClassroomReturn[]
      return { status: 200, data: studentsClassrooms };
    } catch (error: any) { return { status: 500, message: error.message } }
  }

  override async findOneById(id: string | number, body?: ObjectLiteral) {
    try {
      const teacher = await this.teacherByUser(body?.user.user)
      const isAdminSupervisor = teacher.person.category.id === personCategories.ADMINISTRADOR || teacher.person.category.id === personCategories.SUPERVISOR
      const teacherClasses = await this.teacherClassrooms(body?.user)
      const preStudent = await this.student(Number(id));

      if (!preStudent) { return { status: 404, message: 'Registro não encontrado' } }

      const student = this.formartStudentResponse(preStudent)

      if (
        teacherClasses.classrooms.length > 0 &&
        !teacherClasses.classrooms.includes(student.classroom.id) &&
        !isAdminSupervisor
      ) { return { status: 403, message: 'Você não tem permissão para acessar esse registro.' } }


      return { status: 200, data: student };
    } catch (error: any) { return { status: 500, message: error.message } }
  }
  override async save(body: SaveStudent) {
    try {
      const teacher = await this.teacherByUser(body.user.user)
      const teacherClasses = await this.teacherClassrooms(body.user)
      const year = await this.currentYear();
      const state = await this.state(body.state);
      const classroom = await this.classroom(body.classroom);
      const category = await this.studentCategory();
      const disabilities = await this.disabilities(body.disabilities);
      const person = this.createPerson({ name: body.name, birth: body.birth, category });

      if (!year) { return { status: 404, message: 'Não existe um ano letivo ativo. Entre em contato com o Administrador do sistema.' } }

      const exists = await AppDataSource.getRepository(Student).findOne({ where: { ra: body.ra, dv: body.dv } })
      if (exists) {

        const lastStudentRegister = await AppDataSource.getRepository(Student)
          .createQueryBuilder('student')
          .leftJoinAndSelect('student.person', 'person')
          .leftJoinAndSelect('student.studentClassrooms', 'studentClassroom')
          .leftJoinAndSelect('studentClassroom.classroom', 'classroom')
          .leftJoinAndSelect('classroom.school', 'school')
          .leftJoinAndSelect('studentClassroom.year', 'year')
          .where('student.ra = :ra', { ra: body.ra })
          .andWhere('student.dv = :dv', { dv: body.dv })
          .andWhere(new Brackets(qb => {
            qb.where('studentClassroom.endedAt IS NULL')
              .orWhere('studentClassroom.endedAt < :currentDate', { currentDate: new Date() })
          }))
          .getOne() as Student;

        let preResult: StudentClassroom

        const activeStudentClassroom = lastStudentRegister.studentClassrooms.find(sc => sc.endedAt === null) as StudentClassroom

        if (activeStudentClassroom) { preResult = activeStudentClassroom }
        else { preResult = lastStudentRegister.studentClassrooms.find(sc => getTimeZone(sc.endedAt) === Math.max(...lastStudentRegister.studentClassrooms.map(sc => getTimeZone(sc.endedAt)))) as StudentClassroom }

        if (!lastStudentRegister.active) {
          return { status: 409, message: `Já existe um aluno com o RA informado. ${lastStudentRegister.person.name} se formou em: ${preResult?.classroom.shortName} ${preResult?.classroom.school.shortName} no ano de ${preResult?.year.name}.` }
        }

        return { status: 409, message: `Já existe um aluno com o RA informado. ${lastStudentRegister.person.name} tem como último registro: ${preResult?.classroom.shortName} ${preResult?.classroom.school.shortName} no ano ${preResult?.year.name}. ${preResult.endedAt === null ? `Acesse o menu MATRÍCULAS ATIVAS no ano de ${preResult.year.name}.` : `Acesse o menu PASSAR DE ANO no ano de ${preResult.year.name}.`}` }
      }

      if (body.user.category === personCategories.PROFESSOR) {
        if (!teacherClasses.classrooms.includes(classroom.id)) { return { status: 403, message: 'Você não tem permissão para criar um aluno neste sala.' } }
      }

      const student = await this.repository.save(this.createStudent(body, person, state));
      if (!!disabilities.length) {
        await AppDataSource.getRepository(StudentDisability).save(disabilities.map(disability => {
          return { student, startedAt: new Date(), disability }
        }))
      }

      const studentClassroom = await AppDataSource.getRepository(StudentClassroom).save({ student, classroom, year, rosterNumber: Number(body.rosterNumber), startedAt: new Date() }) as StudentClassroom

      const notDigit = /\D/g
      const classroomNumber = Number(studentClassroom.classroom.shortName.replace(notDigit, ''))

      const newTransfer = new Transfer()
      newTransfer.startedAt = new Date()
      newTransfer.endedAt = new Date()
      newTransfer.requester = teacher
      newTransfer.requestedClassroom = classroom
      newTransfer.currentClassroom = classroom
      newTransfer.receiver = teacher
      newTransfer.student = student
      newTransfer.status = await AppDataSource.getRepository(TransferStatus).findOne({ where: { id: 5, name: 'Novo' } }) as TransferStatus
      newTransfer.year = await this.currentYear()
      await AppDataSource.getRepository(Transfer).save(newTransfer)

      if (classroomNumber >= 1 && classroomNumber <= 3) {
        const literacyTier = await AppDataSource.getRepository(LiteracyTier).find() as LiteracyTier[]

        for (let tier of literacyTier) {

          await AppDataSource.getRepository(Literacy).save({
            studentClassroom,
            literacyTier: tier
          })
        }
      }

      if (classroomNumber >= 1 && classroomNumber <= 3) {
        const firstLiteracyLevel = new LiteracyFirst()
        firstLiteracyLevel.student = student

        await AppDataSource.getRepository(LiteracyFirst).save(firstLiteracyLevel)
      }

      if (classroomNumber === 4 || classroomNumber === 5) {
        const textGenderExam = await AppDataSource.getRepository(TextGenderExam).find() as TextGenderExam[]
        const textGenderExamTier = await AppDataSource.getRepository(TextGenderExamTier).find() as TextGenderExamTier[]

        const textGenderClassroom = await AppDataSource.getRepository(TextGenderClassroom).find({
          where: { classroomNumber: classroomNumber },
          relations: ['textGender']
        }) as TextGenderClassroom[]

        for (let tg of textGenderClassroom) {
          for (let tier of textGenderExamTier) {
            for (let exam of textGenderExam) {
              const textGenderGrade = new TextGenderGrade()
              textGenderGrade.studentClassroom = studentClassroom
              textGenderGrade.textGender = tg.textGender
              textGenderGrade.textGenderExam = exam
              textGenderGrade.textGenderExamTier = tier

              await AppDataSource.getRepository(TextGenderGrade).save(textGenderGrade)
            }
          }
        }
      }

      return { status: 201, data: student };
    } catch (error: any) { return { status: 500, message: error.message } }
  }

  async putLiteracyBeforeLevel(body: { user: { user: number, username: string, category: number, iat: number, exp: number }, studentClassroom: StudentClassroom, literacyLevel: LiteracyLevel }) {

    try {

      const classroomNumber = Number(body.studentClassroom.classroom.shortName.replace(/\D/g, ''))

      const register = await AppDataSource.getRepository(LiteracyFirst).findOne({
        relations: ['literacyLevel'],
        where: { student: { id: body.studentClassroom.student.id } }
      })

      if (!register) { return { status: 404, message: 'Registro não encontrado' } }

      if (classroomNumber >= 1 && classroomNumber <= 3 && register && register.literacyLevel === null) {

        register.literacyLevel = body.literacyLevel
        await AppDataSource.getRepository(LiteracyFirst).save(register)

        return { status: 201, data: {} }

      }

      return { status: 201, data: {} }
    } catch (error: any) { return { status: 500, message: error.message } }

  }

  override async updateId(studentId: number | string, body: any) {

    try {

      const userTeacher = await this.teacherByUser(body.user.user)

      const student = await this.repository
        .findOne({ relations: ['person', 'studentDisabilities.disability', 'state'], where: { id: Number(studentId) } }) as Student;

      const bodyClassroom = await AppDataSource.getRepository(Classroom)
        .findOne({ where: { id: body.classroom } })

      const studentClassroom = await AppDataSource.getRepository(StudentClassroom)
        .findOne({ relations: ['student', 'classroom', 'literacies.literacyTier', 'literacies.literacyLevel', 'textGenderGrades', 'year'], where: { id: Number(body.currentStudentClassroomId), student: { id: student.id }, endedAt: IsNull() } }) as StudentClassroom

      if (!student) { return { status: 404, message: 'Registro não encontrado' } }
      if (!studentClassroom) { return { status: 404, message: 'Registro não encontrado' } }
      if (!bodyClassroom) { return { status: 404, message: 'Sala não encontrada' } }

      const composedBodyStudentRa = `${body.ra}${body.dv}`
      const composedStudentRa = `${student.ra}${student.dv}`

      if (composedStudentRa !== composedBodyStudentRa) {
        const exists = await this.repository.findOne({ where: { ra: body.ra, dv: body.dv } })
        if (exists) { return { status: 409, message: 'Já existe um aluno com esse RA' } }
      }

      const canChange = [personCategories.ADMINISTRADOR, personCategories.SUPERVISOR, personCategories.DIRETOR, personCategories.VICE_DIRETOR, personCategories.COORDENADOR, personCategories.SECRETARIO]

      if (!canChange.includes(userTeacher.person.category.id) && studentClassroom?.classroom.id != bodyClassroom.id) { return { status: 403, message: 'Você não tem permissão para alterar a sala de um aluno por aqui. Crie uma solicitação de transferência no menu ALUNOS na opção OUTROS ATIVOS.' } }

      if (studentClassroom?.classroom.id != bodyClassroom.id && canChange.includes(userTeacher.person.category.id)) {

        const newClassroomNumber = Number(bodyClassroom.shortName.replace(/\D/g, ''))
        const oldClassroomNumber = Number(studentClassroom.classroom.shortName.replace(/\D/g, ''))

        if (newClassroomNumber < oldClassroomNumber) { return { status: 404, message: 'Não é possível alterar a sala para uma sala com número menor que a atual.' } }

        await AppDataSource.getRepository(StudentClassroom).save({ ...studentClassroom, endedAt: new Date() })

        const newStudentClassroom = await AppDataSource.getRepository(StudentClassroom).save({
          student,
          classroom: bodyClassroom,
          year: await this.currentYear(),
          rosterNumber: Number(body.rosterNumber),
          startedAt: new Date()
        }) as StudentClassroom

        const notDigit = /\D/g
        const classroomNumber = Number(bodyClassroom.shortName.replace(notDigit, ''))

        if (classroomNumber >= 1 && classroomNumber <= 3) {

          const literacyTier = await AppDataSource.getRepository(LiteracyTier).find() as LiteracyTier[]

          if (
            studentClassroom.classroom.id != newStudentClassroom.classroom.id &&
            oldClassroomNumber === newClassroomNumber &&
            studentClassroom.year.id === newStudentClassroom.year.id
          ) {

            for(let tier of literacyTier) {

              const element = studentClassroom.literacies.find(el => el.literacyTier.id === tier.id)

              if(element) {

                await AppDataSource.getRepository(Literacy).save({
                  studentClassroom: newStudentClassroom,
                  literacyTier: element.literacyTier,
                  literacyLevel: element.literacyLevel
                })
              } else {

                await AppDataSource.getRepository(Literacy).save({
                  studentClassroom: newStudentClassroom,
                  literacyTier: tier
                })
              }
            }
          } else {

            for (let tier of literacyTier) {

              await AppDataSource.getRepository(Literacy).save({
                studentClassroom: newStudentClassroom,
                literacyTier: tier
              })
            }
          }
        }

        if (classroomNumber === 4 || classroomNumber === 5) {
          const textGenderExam = await AppDataSource.getRepository(TextGenderExam).find() as TextGenderExam[]
          const textGenderExamTier = await AppDataSource.getRepository(TextGenderExamTier).find() as TextGenderExamTier[]

          const textGenderClassroom = await AppDataSource.getRepository(TextGenderClassroom).find({
            where: { classroomNumber: classroomNumber },
            relations: ['textGender']
          }) as TextGenderClassroom[]

          for (let tg of textGenderClassroom) {
            for (let tier of textGenderExamTier) {
              for (let exam of textGenderExam) {
                const textGenderGrade = new TextGenderGrade()
                textGenderGrade.studentClassroom = newStudentClassroom
                textGenderGrade.textGender = tg.textGender
                textGenderGrade.textGenderExam = exam
                textGenderGrade.textGenderExamTier = tier

                await AppDataSource.getRepository(TextGenderGrade).save(textGenderGrade)
              }
            }
          }
        }

        const newTransfer = new Transfer()
        newTransfer.startedAt = new Date()
        newTransfer.endedAt = new Date()
        newTransfer.requester = userTeacher
        newTransfer.requestedClassroom = bodyClassroom
        newTransfer.currentClassroom = studentClassroom.classroom
        newTransfer.receiver = userTeacher
        newTransfer.student = student
        newTransfer.status = await AppDataSource.getRepository(TransferStatus).findOne({ where: { id: 1, name: 'Aceitada' } }) as TransferStatus
        newTransfer.year = await this.currentYear()
        await AppDataSource.getRepository(Transfer).save(newTransfer)
      }

      if (studentClassroom.classroom.id === bodyClassroom.id) {
        await AppDataSource.getRepository(StudentClassroom)
          .save({
            ...studentClassroom,
            rosterNumber: body.rosterNumber
          })
      }

      student.ra = body.ra;
      student.dv = body.dv;
      student.state = await this.state(body.state);
      student.observationOne = body.observationOne;
      student.observationTwo = body.observationTwo;
      student.person.name = body.name;
      student.person.birth = body.birth;
      const register = await this.repository.save(student) as Student;

      const stDisabilities = student.studentDisabilities
        .filter((studentDisability) => !studentDisability.endedAt);

      await this.setDisabilities(register, stDisabilities, body.disabilities);

      const preResult = await this.student(Number(studentId));
      const result = this.formartStudentResponse(preResult)

      return { status: 200, data: result };
    } catch (error: any) {
      console.log('error', error)
      return { status: 500, message: error.message }
    }
  }

  async setDisabilities(student: Student, studentDisabilities: StudentDisability[], body: number[]) {
    const currentDisabilities = studentDisabilities.map((studentDisability) => studentDisability.disability.id)

    const create = body.filter((disabilityId) => !currentDisabilities.includes(disabilityId))

    if (create.length) {
      await AppDataSource.getRepository(StudentDisability).save(create.map(disabilityId => {
        return { student, disability: { id: disabilityId }, startedAt: new Date() }
      }))
    }

    const remove = currentDisabilities.filter((disabilityId) => !body.includes(disabilityId))

    if (remove.length) {
      for (let item of remove) {
        const studentDisability = studentDisabilities.find((studentDisability) => studentDisability.disability.id === item)
        if (studentDisability) {
          studentDisability.endedAt = new Date()
          await AppDataSource.getRepository(StudentDisability).save(studentDisability)
        }
      }
    }
  }
  async studentCategory() {
    return await AppDataSource.getRepository(PersonCategory).findOne({ where: { id: personCategories.ALUNO } }) as PersonCategory
  }
  async disabilities(ids: number[]) {
    return await AppDataSource.getRepository(Disability).findBy({ id: In(ids) })
  }
  async student(studentId: number) {

    return await AppDataSource
      .createQueryBuilder()
      .select([
        'student.id',
        'student.ra',
        'student.dv',
        'student.observationOne',
        'student.observationTwo',
        'state.id',
        'state.acronym',
        'person.id',
        'person.name',
        'person.birth',
        'studentClassroom.id',
        'studentClassroom.rosterNumber',
        'studentClassroom.startedAt',
        'studentClassroom.endedAt',
        'classroom.id',
        'classroom.shortName',
        'school.id',
        'school.shortName',
        'GROUP_CONCAT(DISTINCT disability.id ORDER BY disability.id ASC) AS disabilities',
      ])
      .from(Student, 'student')
      .leftJoin('student.person', 'person')
      .leftJoin('student.studentDisabilities', 'studentDisabilities', 'studentDisabilities.endedAt IS NULL')
      .leftJoin('studentDisabilities.disability', 'disability')
      .leftJoin('student.state', 'state')
      .leftJoin('student.studentClassrooms', 'studentClassroom', 'studentClassroom.endedAt IS NULL')
      .leftJoin('studentClassroom.classroom', 'classroom')
      .leftJoin('classroom.school', 'school')
      .where('student.id = :studentId', { studentId })
      .groupBy('studentClassroom.id')
      .getRawOne()
  }
  async studentsClassrooms(options: { search?: string, year?: string, teacherClasses?: { id: number, classrooms: number[] }, owner?: string }, isAdminSupervisor: boolean) {

    const isOwner = options.owner === ISOWNER.OWNER;
    const yearName = options.year ?? (await this.currentYear()).name;
    let allClassrooms: Classroom[] = []
    if (isAdminSupervisor) { allClassrooms = await AppDataSource.getRepository(Classroom).find() as Classroom[] }

    const queryBuilder = AppDataSource.createQueryBuilder();
    queryBuilder
      .select([
        'studentClassroom.id',
        'studentClassroom.rosterNumber',
        'studentClassroom.startedAt',
        'studentClassroom.endedAt',
        'student.id',
        'student.ra',
        'student.dv',
        'state.id',
        'state.acronym',
        'person.id',
        'person.name',
        'person.birth',
        'classroom.id',
        'classroom.shortName',
        'school.id',
        'school.shortName',
        'transfers.id',
        'transfers.startedAt',
        'requesterPerson.name',
        'transfersStatus.name'
      ])
      .from(Student, 'student')
      .leftJoin('student.person', 'person')
      .leftJoin('student.state', 'state')
      .leftJoin('student.transfers', 'transfers', 'transfers.endedAt IS NULL')
      .leftJoin('transfers.status', 'transfersStatus')
      .leftJoin('transfers.requester', 'requester')
      .leftJoin('requester.person', 'requesterPerson')
      .leftJoin('student.studentClassrooms', 'studentClassroom', 'studentClassroom.endedAt IS NULL')
      .leftJoin('studentClassroom.classroom', 'classroom')
      .leftJoin('classroom.school', 'school')
      .leftJoin('studentClassroom.year', 'year')
      .where('year.name = :yearName', { yearName })
      .andWhere(new Brackets(qb => {
        qb.where('person.name LIKE :search', { search: `%${options.search}%` })
          .orWhere('student.ra LIKE :search', { search: `%${options.search}%` });
      }))
      .andWhere(new Brackets(qb => {
        if (!isAdminSupervisor) {
          qb.andWhere(isOwner ? 'classroom.id IN (:...classrooms)' : 'classroom.id NOT IN (:...classrooms)', { classrooms: options.teacherClasses?.classrooms })
        } else {
          qb.andWhere(isOwner ? 'classroom.id IN (:...classrooms)' : 'classroom.id NOT IN (:...classrooms)', { classrooms: allClassrooms.map(classroom => classroom.id) })
        }
      }))
      .orderBy('school.shortName', 'ASC')
      .addOrderBy('classroom.shortName', 'ASC')
      .addOrderBy('person.name', 'ASC')

    const preResult = await queryBuilder.getRawMany();

    return preResult.map((item) => {
      return {
        id: item.studentClassroom_id,
        rosterNumber: item.studentClassroom_rosterNumber,
        startedAt: item.studentClassroom_startedAt,
        endedAt: item.studentClassroom_endedAt,
        student: {
          id: item.student_id,
          ra: item.student_ra,
          dv: item.student_dv,
          state: {
            id: item.state_id,
            acronym: item.state_acronym,
          },
          person: {
            id: item.person_id,
            name: item.person_name,
            birth: item.person_birth,
          },
          transfer: item.transfers_id ? {
            id: item.transfers_id,
            startedAt: item.transfers_startedAt,
            status: {
              name: item.transfersStatus_name,
            },
            requester: {
              name: item.requesterPerson_name,
            }
          } : false,
        },
        classroom: {
          id: item.classroom_id,
          shortName: item.classroom_shortName,
          teacher: options.teacherClasses,
          school: {
            id: item.school_id,
            shortName: item.school_shortName,
          },
        },
      }
    })
  }
  createStudent(body: SaveStudent, person: Person, state: State) {
    const student = new Student()
    student.person = person
    student.ra = body.ra
    student.dv = body.dv
    student.state = state
    student.observationOne = body.observationOne
    student.observationTwo = body.observationTwo
    return student
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
          acronym: student.state_acronym
        },
        person: {
          id: student.person_id,
          name: student.person_name,
          birth: student.person_birth,
        },
        disabilities: student.disabilities?.split(',').map((disabilityId: string) => Number(disabilityId)) ?? [],
      },
      classroom: {
        id: student.classroom_id,
        shortName: student.classroom_shortName,
        school: {
          id: student.school_id,
          shortName: student.school_shortName,
        }
      }
    }
  }

  getOneClassroom(studentClassrooms: StudentClassroom[]) {
    const maxEndedAtIndex = studentClassrooms.findIndex(sc => getTimeZone(sc.endedAt) === Math.max(...studentClassrooms.map(sc => getTimeZone(sc.endedAt))));
    return studentClassrooms[maxEndedAtIndex];
  }

  async graduate(studentId: number | string, body: { user: UserInterface, student: { id: number, active: boolean, classroom: Classroom }, year: number }) {

    const userTeacher = await this.teacherByUser(body.user.user)

    try {

      const student = await AppDataSource.getRepository(Student).findOne({ where: { id: Number(studentId) } }) as Student
      if (!student) { return { status: 404, message: 'Registro não encontrado' } }

      student.active = body.student.active
      await AppDataSource.getRepository(Student).save(student)

      const newTransfer = new Transfer()
      newTransfer.startedAt = new Date()
      newTransfer.endedAt = new Date()
      newTransfer.requester = userTeacher
      newTransfer.requestedClassroom = body.student.classroom
      newTransfer.currentClassroom = body.student.classroom
      newTransfer.receiver = userTeacher
      newTransfer.student = student
      newTransfer.status = await AppDataSource.getRepository(TransferStatus).findOne({ where: { id: 6, name: 'Formado' } }) as TransferStatus
      newTransfer.year = await AppDataSource.getRepository(Year).findOne({ where: { id: body.year } }) as Year
      await AppDataSource.getRepository(Transfer).save(newTransfer)

      return { status: 200, data: student };

    } catch (error: any) { return { status: 500, message: error.message } }
  }
}

export const studentController = new StudentController();

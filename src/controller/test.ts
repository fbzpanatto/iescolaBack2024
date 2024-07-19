import { GenericController } from "./genericController";
import { Test } from "../model/Test";
import { classroomController } from "./classroom";
import { AppDataSource } from "../data-source";
import { Period } from "../model/Period";
import { Classroom } from "../model/Classroom";
import { StudentClassroom } from "../model/StudentClassroom";
import { TestQuestion } from "../model/TestQuestion";
import { Request } from "express";
import { QuestionGroup } from "../model/QuestionGroup";
import { StudentQuestion as SQues } from "../model/StudentQuestion";
import { StudentTestStatus } from "../model/StudentTestStatus";
import { pc } from "../utils/personCategories";
import { Year } from "../model/Year";
import { Brackets, DeepPartial, EntityManager, EntityTarget, ObjectLiteral } from "typeorm";
import { Teacher } from "../model/Teacher";
import { Question } from "../model/Question";
import { Descriptor } from "../model/Descriptor";
import { Topic } from "../model/Topic";
import { ClassroomCategory } from "../model/ClassroomCategory";
import { Discipline } from "../model/Discipline";
import { Bimester } from "../model/Bimester";
import { TestCategory } from "../model/TestCategory";

interface insertStudentsBody { user: ObjectLiteral, studentClassrooms: number[], test: { id: number }, year: number, classroom: { id: number }}
interface notIncludedInterface { id: number, rosterNumber: number, startedAt: Date, endedAt: Date, name: string, ra: number, dv: number }

class TestController extends GenericController<EntityTarget<Test>> {

  constructor() { super(Test) }

  async getFormData(req: Request) {

    try {

      return await AppDataSource.transaction(async (CONN) => {

        const classrooms = (await classroomController.getAllClassrooms(req, false, CONN)).data
        const disciplines = await CONN.find(Discipline)
        const bimesters = await CONN.find(Bimester)
        const testCategories = await CONN.find(TestCategory)
        const questionGroup = await CONN.findOneBy(QuestionGroup, { id: 1 });

        return { status: 200, data: { classrooms, disciplines, bimesters, testCategories, questionGroup } };
      })

    } catch (error: any) { return { status: 500, message: error.message } }
  }

  async getGraphic(req: Request) {

    const { id: testId, classroom: classroomId } = req.params
    const { year: yearId } = req.query

    try {

      return await AppDataSource.transaction(async(CONN) => {
        const teacher = await this.teacherByUser(req.body.user.user, CONN)
        const masterUser = teacher.person.category.id === pc.ADMN || teacher.person.category.id === pc.SUPE

        const { classrooms } = await this.teacherClassrooms(req.body.user, CONN)
        if(!classrooms.includes(Number(classroomId)) && !masterUser) return { status: 403, message: "Você não tem permissão para acessar essa sala." }

        const classroom = await CONN.findOne(Classroom, { where: { id: Number(classroomId) }, relations: ["school"] })
        if (!classroom) return { status: 404, message: "Sala não encontrada" }

        const testQuestions = await this.getTestQuestions(parseInt(testId), CONN)
        if (!testQuestions) return { status: 404, message: "Questões não encontradas" }

        const testQuestionsIds = testQuestions.map(testQuestion => testQuestion.id)
        const questionGroups = await this.getTestQuestionsGroups(Number(testId), CONN)

        const test = await CONN.getRepository(Test)
          .createQueryBuilder("test")
          .leftJoinAndSelect("test.period", "period")
          .leftJoinAndSelect("period.bimester", "periodBimester")
          .leftJoinAndSelect("period.year", "periodYear")
          .leftJoinAndSelect("test.discipline", "discipline")
          .leftJoinAndSelect("test.category", "category")
          .leftJoinAndSelect("test.person", "testPerson")
          .leftJoinAndSelect("test.classrooms", "classroom")
          .leftJoinAndSelect("classroom.school", "school")
          .leftJoinAndSelect("classroom.studentClassrooms", "studentClassroom")
          .leftJoinAndSelect("studentClassroom.studentStatus", "studentStatus")
          .leftJoinAndSelect("studentStatus.test", "studentStatusTest")
          .leftJoinAndSelect("studentClassroom.student", "student")
          .leftJoinAndSelect("studentClassroom.studentQuestions", "studentQuestions")
          .leftJoinAndSelect("studentQuestions.testQuestion", "testQuestion", "testQuestion.id IN (:...testQuestions)", { testQuestions: testQuestionsIds })
          .leftJoinAndSelect("testQuestion.questionGroup", "questionGroup")
          .leftJoinAndSelect("student.person", "studentPerson")
          .leftJoin("studentClassroom.year", "studentClassroomYear")
          .where("test.id = :testId", { testId })
          .andWhere("periodYear.id = :yearId", { yearId })
          .andWhere("studentClassroomYear.id = :yearId", { yearId })
          .andWhere("testQuestion.test = :testId", { testId })
          .andWhere("studentStatusTest.id = :testId", { testId })
          .orderBy("questionGroup.id", "ASC")
          .addOrderBy("testQuestion.order", "ASC")
          .addOrderBy("studentClassroom.rosterNumber", "ASC")
          .addOrderBy("classroom.shortName", "ASC")
          .getOne()

        if(!test) return { status: 404, message: "Teste não encontrado" }

        let response = { ...test, testQuestions, questionGroups }

        const allClasses = response.classrooms
        allClasses.map((classroom: Classroom) => {
          classroom.studentClassrooms = classroom.studentClassrooms.map((studentClassroom) => {
            studentClassroom.studentQuestions = studentClassroom.studentQuestions.map((studentQuestion) => {
              const testQuestion = testQuestions.find((testQuestion: TestQuestion) => testQuestion.id === studentQuestion.testQuestion.id) as TestQuestion
              if(studentQuestion.answer.length === 0) return ({ ...studentQuestion, score: 0 })
              const score = testQuestion?.answer.includes(studentQuestion.answer.toUpperCase()) ? 1 : 0
              return {...studentQuestion, score}
            })
            return studentClassroom
          })
          return classroom
        })

        const filteredClasses = allClasses.filter(el => el.school.id === classroom.school.id)
        const cityHall = { id: 'ITA', name: 'PREFEITURA DO MUNICIPIO DE ITATIBA', shortName: 'ITA', school: { id: 99, name: 'PREFEITURA DO MUNICIPIO DE ITATIBA', shortName: 'ITATIBA', inep: null, active: true }, studentClassrooms: allClasses.flatMap(cl => cl.studentClassrooms)} as unknown as Classroom

        response.classrooms = [ ...filteredClasses, cityHall ]

        const newReturn = { ...response, classrooms: response.classrooms.map((classroom: Classroom) => { return { ...classroom, studentClassrooms: classroom.studentClassrooms.map((studentClassroom) => { return { ...studentClassroom, studentStatus: studentClassroom.studentStatus.find(studentStatus => studentStatus.test.id === test.id)}})}})}

        return { status: 200, data: newReturn };
      })
    } catch (error: any) { return { status: 500, message: error.message } }
  }

  async getStudents(request?: Request) {

    const testId = parseInt(request?.params.id as string)
    const classroomId = parseInt(request?.params.classroom as string)
    const yearName = request?.params.year as string

    try {

      return await AppDataSource.transaction(async (CONN) => {

        const uTeacher = await this.teacherByUser(request?.body.user.user, CONN)

        const masterUser = uTeacher.person.category.id === pc.ADMN || uTeacher.person.category.id === pc.SUPE

        const { classrooms } = await this.teacherClassrooms(request?.body.user, CONN)

        const message = "Você não tem permissão para acessar essa sala."
        if(!classrooms.includes(classroomId) && !masterUser) { return { status: 403, message } }

        const test = await this.getTest(testId, yearName, CONN)

        if(!test) return { status: 404, message: "Teste não encontrado" }

        const questionGroups = await this.getTestQuestionsGroups(testId, CONN)

        const testQuestions = await this.getTestQuestions(test.id, CONN)

        const classroom = await CONN.getRepository(Classroom)
          .createQueryBuilder("classroom")
          .leftJoinAndSelect("classroom.school", "school")
          .where("classroom.id = :classroomId", { classroomId })
          .getOne();

        const studentClassrooms = await this.studentClassrooms(test, Number(classroomId), (yearName as string), CONN)

        await this.createLink(studentClassrooms, test, testQuestions, uTeacher.person.user.id, CONN)

        const studentClassroomsWithQuestions = await this.setQuestionsForStudent(test, testQuestions, Number(classroomId), yearName as string, CONN)

        let data = { test, classroom, testQuestions, studentClassrooms: studentClassroomsWithQuestions, questionGroups }

        return { status: 200, data };
      })
    } catch (error: any) { return { status: 500, message: error.message } }
  }

  async setQuestionsForStudent(test: Test, testQuestions: TestQuestion[], classroomId: number, yearName: string, CONN: EntityManager) {

    const testQuestionsIds = testQuestions.map(testQuestion => testQuestion.id)
    const preResult = await CONN.getRepository(StudentClassroom)
      .createQueryBuilder("studentClassroom")
      .leftJoinAndSelect("studentClassroom.student", "student")
      .leftJoinAndSelect("studentClassroom.studentStatus", "studentStatus")
      .leftJoinAndSelect("studentStatus.test", "stStatusTest")
      .leftJoin("studentClassroom.year", "year")
      .leftJoinAndSelect("student.person", "person")
      .leftJoinAndSelect("studentClassroom.classroom", "classroom")
      .leftJoinAndSelect("studentClassroom.studentQuestions", "studentQuestions")
      .leftJoinAndSelect("studentQuestions.testQuestion", "testQuestion", "testQuestion.id IN (:...testQuestions)", { testQuestions: testQuestionsIds })
      .leftJoinAndSelect("testQuestion.questionGroup", "questionGroup")
      .leftJoin("testQuestion.test", "test")
      .where("studentClassroom.classroom = :classroomId", { classroomId })
      .andWhere(new Brackets(qb => {
        qb.where("studentClassroom.startedAt < :testCreatedAt", { testCreatedAt: test.createdAt })
        qb.orWhere("studentQuestions.id IS NOT NULL")
      }))
      .andWhere("testQuestion.test = :testId", { testId: test.id })
      .andWhere("stStatusTest.id = :testId", { testId: test.id })
      .andWhere("year.name = :yearName", { yearName })
      .orderBy("questionGroup.id", "ASC")
      .addOrderBy("testQuestion.order", "ASC")
      .addOrderBy("studentClassroom.rosterNumber", "ASC")
      .getMany();

    return preResult.map(studentClassroom => {
      const studentQuestions = studentClassroom.studentQuestions.map(studentQuestion => {
        const testQuestion = testQuestions.find(testQuestion => testQuestion.id === studentQuestion.testQuestion.id)
        if(studentQuestion.answer.length === 0) return ({ ...studentQuestion, score: 0 })
        const score = testQuestion?.answer.includes(studentQuestion.answer.toUpperCase()) ? 1 : 0
        return {...studentQuestion, score }
      })
      return {
        ...studentClassroom,
        studentStatus: studentClassroom.studentStatus.find(studentStatus => studentStatus.test.id === test.id),
        studentQuestions
      }
    })
  }

  async studentClassrooms(test: Test, classroomId: number, yearName: string, CONN: EntityManager) {
    return await CONN.getRepository(StudentClassroom)
      .createQueryBuilder("studentClassroom")
      .leftJoin("studentClassroom.year", "year")
      .leftJoin("studentClassroom.studentQuestions", "studentQuestions")
      .leftJoinAndSelect("studentClassroom.studentStatus", "studentStatus")
      .leftJoinAndSelect("studentStatus.test", "test", "test.id = :testId", { testId: test.id })
      .leftJoinAndSelect("studentClassroom.student", "student")
      .leftJoinAndSelect("student.person", "person")
      .where("studentClassroom.classroom = :classroomId", { classroomId })
      .andWhere(new Brackets(qb => {
        qb.where("studentClassroom.startedAt < :testCreatedAt", { testCreatedAt: test.createdAt });
        qb.orWhere("studentQuestions.id IS NOT NULL")
      }))
      .andWhere("year.name = :yearName", { yearName })
      .getMany();
  }

  async getTestQuestionsGroups(testId: number, CONN: EntityManager) {
    return await CONN.getRepository(QuestionGroup)
      .createQueryBuilder("questionGroup")
      .select(["questionGroup.id AS id", "questionGroup.name AS name"])
      .addSelect("COUNT(testQuestions.id)", "questionsCount")
      .leftJoin("questionGroup.testQuestions", "testQuestions")
      .where("testQuestions.test = :testId", { testId })
      .groupBy("questionGroup.id")
      .getRawMany();
  }

  async getAllToInsert(request: Request) {

    const testId = request?.params.id
    const classroomId = request?.params.classroom
    const yearName = request.params.year

    try {
      return await AppDataSource.transaction(async (CONN) => {
        const test = await this.getTest(Number(testId), Number(yearName), CONN)
        if(!test) return { status: 404, message: "Teste não encontrado" }
        const response = await this.notIncluded(test, Number(classroomId), Number(yearName), CONN)
        return { status: 200, data: response };
      })
    } catch (error: any) { return { status: 500, message: error.message } }
  }

  async createLink(studentClassrooms: ObjectLiteral[], test: Test, testQuestions: TestQuestion[], userId: number, CONN: EntityManager) {
    for(let studentClassroom of studentClassrooms) {

      const options = { where: { test: { id: test.id }, studentClassroom: { id: studentClassroom.id } }}
      const stStatus = await CONN.findOne(StudentTestStatus, options)

      const el = { active: true, test, studentClassroom, observation: '', createdAt: new Date(), createdByUser: userId } as StudentTestStatus
      if(!stStatus) { await CONN.save(StudentTestStatus, el) }

      for(let testQuestion of testQuestions) {

        const options = { where: { testQuestion: { id: testQuestion.id, test: { id: test.id }, question: { id: testQuestion.question.id } }, studentClassroom: { id: studentClassroom.id } } }
        const sQuestion = await CONN.findOne(SQues, options) as SQues

        if(!sQuestion) { await CONN.save(SQues, { answer: '', testQuestion: testQuestion, studentClassroom: studentClassroom, createdAt: new Date(), createdByUser: userId })}
      }
    }
  }

  async insertStudents(req: Request) {

    const body = req.body as insertStudentsBody

    try {

      return await AppDataSource.transaction(async (CONN) => {

        const uTeacher = await this.teacherByUser(body.user.user, CONN)

        const test = await this.getTest(body.test.id, body.year, CONN)
        if(!test) return { status: 404, message: "Teste não encontrado" }

        const stClassrooms = await this.notIncluded(test, body.classroom.id, body.year, CONN)
        if(!stClassrooms || stClassrooms.length < 1) return { status: 404, message: "Alunos não encontrados" }

        const testQuestions = await this.getTestQuestions(test.id, CONN)

        const filteredSC = stClassrooms.filter(studentClassroom => body.studentClassrooms.includes(studentClassroom.id))

        await this.createLink(filteredSC, test, testQuestions, uTeacher.person.user.id, CONN)
        return { status: 200, data: {} };
      })
    } catch (error: any) { return { status: 500, message: error.message } }
  }

  async notIncluded(test: Test, classroomId: number, yearName: number, CONN: EntityManager) {

    return await CONN.getRepository(StudentClassroom)
      .createQueryBuilder("studentClassroom")
      .select([ 'studentClassroom.id AS id', 'studentClassroom.rosterNumber AS rosterNumber', 'studentClassroom.startedAt AS startedAt', 'studentClassroom.endedAt AS endedAt', 'person.name AS name', 'student.ra AS ra', 'student.dv AS dv' ])
      .leftJoin("studentClassroom.year", "year")
      .leftJoin("studentClassroom.studentQuestions", "studentQuestions")
      .leftJoin("studentClassroom.studentStatus", "studentStatus")
      .leftJoin("studentStatus.test", "test", "test.id = :testId", {testId: test.id})
      .leftJoin("studentClassroom.student", "student")
      .leftJoin("student.person", "person")
      .where("studentClassroom.classroom = :classroomId", {classroomId})
      .andWhere("studentClassroom.startedAt > :testCreatedAt", {testCreatedAt: test.createdAt})
      .andWhere("studentClassroom.endedAt IS NULL")
      .andWhere("year.name = :yearName", {yearName})
      .andWhere("studentQuestions.id IS NULL")
      .getRawMany() as unknown as notIncludedInterface[]
  }

  async findAllByYear(request: Request) {

    const yearName = request.params.year
    const search = request.query.search as string
    const userBody = request.body.user

    try {

      return AppDataSource.transaction(async(CONN) => {

        const { classrooms } = await this.teacherClassrooms(request?.body.user, CONN)

        const testClasses = await CONN.getRepository(Test)
          .createQueryBuilder("test")
          .leftJoinAndSelect("test.person", "person")
          .leftJoinAndSelect("test.period", "period")
          .leftJoinAndSelect("test.category", "category")
          .leftJoinAndSelect("period.year", "year")
          .leftJoinAndSelect("period.bimester", "bimester")
          .leftJoinAndSelect("test.discipline", "discipline")
          .leftJoinAndSelect("test.classrooms", "classroom")
          .leftJoinAndSelect("classroom.school", "school")
          .where(new Brackets(qb => { if(userBody.category != pc.ADMN && userBody.category != pc.SUPE) { qb.where("classroom.id IN (:...teacherClasses)", { teacherClasses: classrooms }) } }))
          .andWhere("year.name = :yearName", { yearName })
          .andWhere("test.name LIKE :search", { search: `%${search}%` })
          .getMany();

        return { status: 200, data: testClasses };
      })
    } catch (error: any) { return { status: 500, message: error.message } }
  }

  async getById(req: Request) {

    const { id } = req.params

    try {

      return await AppDataSource.transaction(async(CONN) => {

        const teacher = await this.teacherByUser(req.body.user.user, CONN)
        const masterUser = teacher.person.category.id === pc.ADMN || teacher.person.category.id === pc.SUPE;

        const op = { relations: ["period", "period.year", "period.bimester", "discipline", "category", "person", "classrooms.school"], where: { id: parseInt(id) } }
        const test = await CONN.findOne(Test, { ...op })

        if(teacher.person.id !== test?.person.id && !masterUser) return { status: 403, message: "Você não tem permissão para editar esse teste." }
        if (!test) { return { status: 404, message: 'Data not found' } }

        const testQuestions = await this.getTestQuestions(test.id, CONN)

        return { status: 200, data: { ...test, testQuestions } };
      })

    } catch (error: any) { return { status: 500, message: error.message } }
  }

  async saveTest(body: DeepPartial<ObjectLiteral>) {

    const classesIds = body.classroom.map((classroom: { id: number }) => classroom.id)

    try {
      return await AppDataSource.transaction(async (CONN) => {

        const uTeacher = await this.teacherByUser(body.user.user, CONN);
        if(!uTeacher) return { status: 404, message: "Usuário inexistente" }

        const checkYear = await CONN.findOne(Year, { where: { id: body.year.id } })
        if(!checkYear) return { status: 404, message: "Ano não encontrado" }
        if(!checkYear.active) return { status: 400, message: "Não é possível criar um teste para um ano letivo inativo." }

        const option = { relations: ["year", "bimester"], where: { year: body.year, bimester: body.bimester } }
        const period = await CONN.findOne(Period, option)
        if(!period) return { status: 404, message: "Período não encontrado" }

        const classes = await CONN.getRepository(Classroom)
          .createQueryBuilder("classroom")
          .select(["classroom.id", "classroom.name", "classroom.shortName"])
          .leftJoinAndSelect("classroom.studentClassrooms", "studentClassroom")
          .leftJoinAndSelect("studentClassroom.student", "student")
          .leftJoinAndSelect("student.person", "person")
          .leftJoinAndSelect("classroom.school", "school")
          .leftJoin('studentClassroom.year', 'year')
          .where("classroom.id IN (:...classesIds)", { classesIds })
          .andWhere('year.id = :yearId', { yearId: period.year.id })
          .andWhere("studentClassroom.startedAt < :testCreatedAt", { testCreatedAt: new Date() })
          .andWhere('studentClassroom.endedAt IS NULL')
          .groupBy("classroom.id, studentClassroom.id")
          .having("COUNT(studentClassroom.id) > 0")
          .getMany();

        if(!classes || classes.length < 1) return { status: 400, message: "Não existem alunos matriculados em uma ou mais salas informadas." }

        const test = await CONN.save(Test, {
          name: body.name,
          category: body.category,
          discipline: body.discipline,
          person: uTeacher.person,
          period: period,
          classrooms: classes,
          createdAt: new Date(),
          createdByUser: uTeacher.person.user.id
        });

        const tQts = body.testQuestions.map((el: any) => ({
          ...el,
          createdAt: new Date(),
          createdByUser: uTeacher.person.user.id,
          question: { ...el.question, person: el.question.person || uTeacher.person, createdAt: new Date(), createdByUser: uTeacher.person.user.id },
          test
        }))

        await CONN.save(TestQuestion, tQts)
        return { status: 201, data: test };
      })
    } catch (error: any) {
      console.log(error)
      return { status: 500, message: error.message }
    }
  }

  async updateTest(id: number | string, req: Request) {
    try {
      return await AppDataSource.transaction(async (CONN) => {

        const uTeacher = await this.teacherByUser(req.body.user.user, CONN) as Teacher
        const userId = uTeacher.person.user.id
        const masterUser = uTeacher.person.category.id === pc.ADMN || uTeacher.person.category.id === pc.SUPE
        const test = await CONN.findOne(Test, { relations: ["person"], where: { id: Number(id) } })

        if(!test) return { status: 404, message: "Teste não encontrado" }
        if(uTeacher.person.id !== test.person.id && !masterUser) return { status: 403, message: "Você não tem permissão para editar esse teste." }

        test.name = req.body.name
        test.updatedAt = new Date()
        test.updatedByUser = userId

        await CONN.save(Test, test)

        const bodyTq = req.body.testQuestions as TestQuestion[]
        const dataTq = await this.getTestQuestions(test.id, CONN)

        for (let next of bodyTq) {
          const curr = dataTq.find(el => el.id === next.id);

          if (!curr) { await CONN.save(TestQuestion, { ...next, createdAt: new Date(), createdByUser: userId, question: { ...next.question, person: next.question.person || uTeacher.person, createdAt: new Date(), createdByUser: userId, }, test }) }
          else {
            const testQuestionCondition = this.diffs(curr, next);

            if (testQuestionCondition) { await CONN.save(TestQuestion, { ...next, createdAt: curr.createdAt, createdByUser: curr.createdByUser, updatedAt: new Date(), updatedByUser: userId }) }

            if (this.diffs(curr.question, next.question)) {
              await CONN.save(Question, {...next.question,createdAt: curr.question.createdAt,createdByUser: curr.question.createdByUser, updatedAt: new Date(), updatedByUser: userId })
            }

            if (this.diffs(curr.question.descriptor, next.question.descriptor)) {
              await CONN.save(Descriptor, { ...next.question.descriptor, createdAt: curr.question.descriptor.createdAt, createdByUser: curr.question.descriptor.createdByUser, updatedAt: new Date(), updatedByUser: userId })
            }

            if (this.diffs(curr.question.descriptor.topic, next.question.descriptor.topic)) {
              await CONN.save(Topic, { ...next.question.descriptor.topic, createdAt: curr.question.descriptor.topic.createdAt, createdByUser: curr.question.descriptor.topic.createdByUser, updatedAt: new Date(), updatedByUser: userId })
            }

            if (this.diffs(curr.question.descriptor.topic.classroomCategory, next.question.descriptor.topic.classroomCategory)) {
              await CONN.save(ClassroomCategory, { ...next.question.descriptor.topic.classroomCategory, createdAt: curr.question.descriptor.topic.classroomCategory.createdAt, createdByUser: curr.question.descriptor.topic.classroomCategory.createdByUser, updatedAt: new Date(), updatedByUser: userId })
            }

            if (this.diffs(curr.questionGroup, next.questionGroup)) {
              await CONN.save(QuestionGroup, { ...next.questionGroup, createdAt: curr.questionGroup.createdAt, createdByUser: curr.questionGroup.createdByUser, updatedAt: new Date(), updatedByUser: userId })
            }
          }
        }

        const result = (await this.findOneById(id, req, CONN)).data

        return { status: 200, data: result };
      })
    } catch (error: any) { return { status: 500, message: error.message } }
  }

  diffs = (original: any, current: any): boolean => {
    if (original === current) return false;
    if (typeof original !== 'object' || original === null || current === null) return original !== current;

    const originalKeys = Object.keys(original);
    const currentKeys = Object.keys(current);

    if (originalKeys.length !== currentKeys.length) return true;

    for (let key of originalKeys) {
      if (!currentKeys.includes(key)) return true;
      if (this.diffs(original[key], current[key])) { return true }
    }

    return false;
  }

  async getTest(testId:number , yearName: number | string, CONN: EntityManager) {
    return CONN.getRepository(Test)
      .createQueryBuilder("test")
      .leftJoinAndSelect("test.person", "person")
      .leftJoinAndSelect("test.period", "period")
      .leftJoinAndSelect("period.bimester", "bimester")
      .leftJoinAndSelect("period.year", "year")
      .leftJoinAndSelect("test.discipline", "discipline")
      .leftJoinAndSelect("test.category", "category")
      .where("test.id = :testId", { testId })
      .andWhere("year.name = :yearName", { yearName })
      .getOne()
  }

  async getTestQuestions(testId: number, CONN: EntityManager) {
    return await CONN.getRepository(TestQuestion)
      .createQueryBuilder("testQuestion")
      .select(["testQuestion.id", "testQuestion.order", "testQuestion.answer", "testQuestion.active", "question.id", "question.title", "person.id", "question.person", "descriptor.id", "descriptor.code", "descriptor.name", "topic.id", "topic.name", "topic.description", "classroomCategory.id", "classroomCategory.name", "questionGroup.id", "questionGroup.name"])
      .leftJoin("testQuestion.question", "question")
      .leftJoin("question.person", "person")
      .leftJoin("question.descriptor", "descriptor")
      .leftJoin("descriptor.topic", "topic")
      .leftJoin("topic.classroomCategory", "classroomCategory")
      .leftJoin("testQuestion.questionGroup", "questionGroup")
      .where("testQuestion.test = :testId", { testId })
      .orderBy("questionGroup.id", "ASC")
      .addOrderBy("testQuestion.order", "ASC")
      .getMany();
  }
}

export const testController = new TestController();

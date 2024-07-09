import { GenericController } from "./genericController";
import { Test } from "../model/Test";
import { classroomController } from "./classroom";
import { disciplineController } from "./discipline";
import { bimesterController } from "./bimester";
import { testCategoryController } from "./testCategory";
import { questionGroupController } from "./questionGroup";
import { AppDataSource } from "../data-source";
import { Person } from "../model/Person";
import { Period } from "../model/Period";
import { Classroom } from "../model/Classroom";
import { StudentClassroom } from "../model/StudentClassroom";
import { TestQuestion } from "../model/TestQuestion";
import { Request } from "express";
import { QuestionGroup } from "../model/QuestionGroup";
import { StudentQuestion } from "../model/StudentQuestion";
import { StudentTestStatus } from "../model/StudentTestStatus";
import { pc } from "../utils/personCategories";
import { Year } from "../model/Year";
import { Brackets, DeepPartial, EntityTarget, FindManyOptions, ObjectLiteral, SaveOptions } from "typeorm";

class TestController extends GenericController<EntityTarget<Test>> {

  constructor() {
    super(Test);
  }

  async getFormData(req: Request) {

    try {

      const classrooms = (await classroomController.findAllWhere({}, req)).data
      const disciplines = (await disciplineController.findAllWhere({}, req)).data
      const bimesters = (await bimesterController.findAllWhere({}, req)).data
      const testCategories = (await testCategoryController.findAllWhere({}, req)).data
      const questionGroup = (await questionGroupController.findOneById(1, {})).data

      return { status: 200, data: { classrooms, disciplines, bimesters, testCategories, questionGroup } };
    } catch (error: any) { return { status: 500, message: error.message } }
  }

  async getGraphic(request: Request) {

    const testId = request?.params.id
    const classroomId = request?.params.classroom
    const yearId = request?.query.year as string

    try {

      const teacher = await this.teacherByUser(request?.body.user.user)
      const isAdminSupervisor = teacher.person.category.id === pc.ADMINISTRADOR || teacher.person.category.id === pc.SUPERVISOR

      const { classrooms } = await this.teacherClassrooms(request?.body.user)
      if(!classrooms.includes(Number(classroomId)) && !isAdminSupervisor) return { status: 403, message: "Você não tem permissão para acessar essa sala." }

      const classroom = await AppDataSource.getRepository(Classroom).findOne({ where: { id: Number(classroomId) }, relations: ["school"] })
      if (!classroom) return { status: 404, message: "Sala não encontrada" }

      const testQuestions = await this.getTestQuestions(Number(testId))
      if (!testQuestions) return { status: 404, message: "Questões não encontradas" }

      const testQuestionsIds = testQuestions.map(testQuestion => testQuestion.id)
      const questionGroups = await this.getTestQuestionsGroups(Number(testId))

      const test = await AppDataSource.getRepository(Test)
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
            const testQuestion = testQuestions.find(testQuestion => testQuestion.id === studentQuestion.testQuestion.id)
            if(studentQuestion.answer.length === 0) return ({ ...studentQuestion, score: 0 })
            const score = testQuestion?.answer.includes(studentQuestion.answer.toUpperCase()) ? 1 : 0
            return {...studentQuestion, score}
          })
          return studentClassroom
        })
        return classroom
      })

      const filteredClasses = allClasses.filter(el => el.school.id === classroom.school.id)
      const cityHall = {
        id: 'ITA',
        name: 'PREFEITURA DO MUNICIPIO DE ITATIBA',
        shortName: 'ITA',
        school: {
          id: 99,
          name: 'PREFEITURA DO MUNICIPIO DE ITATIBA',
          shortName: 'ITATIBA',
          inep: null,
          active: true
        },
        studentClassrooms: allClasses.flatMap(cl => cl.studentClassrooms)
      } as unknown as Classroom

      // for(let el of allClasses) {
      //   for(let student of el.studentClassrooms) {
      //     cityHall.studentClassrooms.push(student)
      //   }
      // }

      response.classrooms = [ ...filteredClasses, cityHall ]

      const newReturn = {
        ...response,
        classrooms: response.classrooms.map((classroom: Classroom) => {
          return {
            ...classroom,
            studentClassrooms: classroom.studentClassrooms.map((studentClassroom) => {
              return {
                ...studentClassroom,
                studentStatus: studentClassroom.studentStatus.find(studentStatus => studentStatus.test.id === test.id)
              }
            })
          }
        })
      }

      return { status: 200, data: newReturn };
    } catch (error: any) { return { status: 500, message: error.message } }
  }

  async getAllClassroomStudents(options: FindManyOptions<ObjectLiteral> | undefined, request?: Request) {

    const testId = request?.params.id
    const classroomId = request?.params.classroom
    const yearName = request?.params.year

    try {

      const teacher = await this.teacherByUser(request?.body.user.user)
      const isAdminSupervisor = teacher.person.category.id === pc.ADMINISTRADOR || teacher.person.category.id === pc.SUPERVISOR
      const { classrooms } = await this.teacherClassrooms(request?.body.user)
      if(!classrooms.includes(Number(classroomId)) && !isAdminSupervisor) return { status: 403, message: "Você não tem permissão para acessar essa sala." }

      const test = await this.getTest(Number(testId), Number(yearName))

      if(!test) return { status: 404, message: "Teste não encontrado" }

      const questionGroups = await this.getTestQuestionsGroups(Number(testId))

      const testQuestions = await this.getTestQuestions(Number(testId))

      const classroom = await AppDataSource.getRepository(Classroom)
        .createQueryBuilder("classroom")
        .leftJoinAndSelect("classroom.school", "school")
        .where("classroom.id = :classroomId", { classroomId })
        .getOne();

      const studentClassrooms = await this.studentClassrooms(test, Number(classroomId), yearName as string)

      await this.linkStudentToTest(studentClassrooms, test, testQuestions)

      const studentClassroomsWithQuestions = await this.studentClassroomsWithQuestions(test, testQuestions, Number(classroomId), yearName as string)

      return { status: 200, data: { test, classroom, testQuestions, studentClassrooms: studentClassroomsWithQuestions, questionGroups  } };
    } catch (error: any) {
      return { status: 500, message: error.message }
    }
  }

  async studentClassroomsWithQuestions(test: Test, testQuestions: TestQuestion[], classroomId: number, yearName: string) {

    const testQuestionsIds = testQuestions.map(testQuestion => testQuestion.id)
    const preResult = await AppDataSource.getRepository(StudentClassroom)
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

  async studentClassrooms(test: Test, classroomId: number, yearName: string) {
    return await AppDataSource.getRepository(StudentClassroom)
      .createQueryBuilder("studentClassroom")
      .leftJoin("studentClassroom.year", "year")
      .leftJoin("studentClassroom.studentQuestions", "studentQuestions")
      .leftJoinAndSelect("studentClassroom.studentStatus", "studentStatus")
      .leftJoinAndSelect("studentStatus.test", "test", "test.id = :testId", { testId: test.id })
      .leftJoinAndSelect("studentClassroom.student", "student")
      .leftJoinAndSelect("student.person", "person")
      .where("studentClassroom.classroom = :classroomId", { classroomId })
      .andWhere(new Brackets(qb => {
        qb.where("studentClassroom.startedAt < :testCreatedAt", { testCreatedAt: test.createdAt })
        qb.orWhere("studentQuestions.id IS NOT NULL")
      }))
      .andWhere("year.name = :yearName", { yearName })
      .getMany();
  }

  async getTestQuestions(testId: number) {
    return await AppDataSource.getRepository(TestQuestion)
      .createQueryBuilder("testQuestion")
      .leftJoinAndSelect("testQuestion.question", "question")
      .leftJoinAndSelect("testQuestion.questionGroup", "questionGroup")
      .leftJoin("testQuestion.test", "test")
      .where("testQuestion.test = :testId", { testId })
      .orderBy("questionGroup.id", "ASC")
      .addOrderBy("testQuestion.order", "ASC")
      .getMany();
  }

  async getTestQuestionsGroups(testId: number) {
    return await AppDataSource.getRepository(QuestionGroup)
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

      const test = await this.getTest(Number(testId), Number(yearName))
      if(!test) return { status: 404, message: "Teste não encontrado" }

      const response = await this.getStudentsThatAreNotIncluded(test, Number(classroomId), Number(yearName) )

      return { status: 200, data: response };

    } catch (error: any) { return { status: 500, message: error.message } }
  }

  async linkStudentToTest(studentClassrooms: ObjectLiteral[], test: Test, testQuestions: TestQuestion[]) {
    for(let studentClassroom of studentClassrooms) {

      const studentTestStatus = await AppDataSource.getRepository(StudentTestStatus)
        .findOne({
          where: { test: { id: test.id }, studentClassroom: { id: studentClassroom.id } },
        }) as StudentTestStatus

      if(!studentTestStatus) {
        await AppDataSource.getRepository(StudentTestStatus).save({
          active: true,
          test: test,
          studentClassroom: studentClassroom,
          observation: '',
        })
      }

      for(let testQuestion of testQuestions) {
        const studentQuestion = await AppDataSource.getRepository(StudentQuestion)
          .findOne({
            where: { testQuestion: { id: testQuestion.id, test: { id: test.id }, question: { id: testQuestion.question.id } }, studentClassroom: { id: studentClassroom.id } },
          }) as StudentQuestion

        if(!studentQuestion) {
          await AppDataSource.getRepository(StudentQuestion).save({
            answer: '',
            testQuestion: testQuestion,
            studentClassroom: studentClassroom,
          })
        }
      }
    }
  }

  async insertStudents(body: {user: ObjectLiteral, studentClassrooms: number[], test: {id: number}, year: number, classroom: {id: number}}) {

    try {

      const test = await this.getTest(body.test.id, body.year)
      if(!test) return { status: 404, message: "Teste não encontrado" }

      const studentClassrooms = await this.getStudentsThatAreNotIncluded(test, body.classroom.id, body.year )
      if(!studentClassrooms || studentClassrooms.length < 1) return { status: 404, message: "Alunos não encontrados" }

      const testQuestions = await this.getTestQuestions(test.id)

      const filteredStudentClassrooms = studentClassrooms.filter(studentClassroom => body.studentClassrooms.includes(studentClassroom.id))

      await this.linkStudentToTest(filteredStudentClassrooms, test, testQuestions)

      let result = {}

      return { status: 200, data: result };

    } catch (error: any) { return { status: 500, message: error.message } }
  }

  async getStudentsThatAreNotIncluded(test: Test, classroomId: number, yearName: number) {

    return await AppDataSource.getRepository(StudentClassroom)
      .createQueryBuilder("studentClassroom")
      .select([
        'studentClassroom.id AS id',
        'studentClassroom.rosterNumber AS rosterNumber',
        'studentClassroom.startedAt AS startedAt',
        'studentClassroom.endedAt AS endedAt',
        'person.name AS name',
        'student.ra AS ra',
        'student.dv AS dv',
      ])
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
      .getRawMany() as unknown as { id: number, rosterNumber: number, startedAt: Date, endedAt: Date, name: string, ra: number, dv: number }[]
  }

  override async findAllWhere(options: FindManyOptions<ObjectLiteral> | undefined, request?: Request) {

    const yearName = request?.params.year
    const search = request?.query.search as string
    const userBody = request?.body.user

    try {

      const teacherClasses = await this.teacherClassrooms(request?.body.user)

      const testClasses = await AppDataSource.getRepository(Test)
        .createQueryBuilder("test")
        .leftJoinAndSelect("test.person", "person")
        .leftJoinAndSelect("test.period", "period")
        .leftJoinAndSelect("test.category", "category")
        .leftJoinAndSelect("period.year", "year")
        .leftJoinAndSelect("period.bimester", "bimester")
        .leftJoinAndSelect("test.discipline", "discipline")
        .leftJoinAndSelect("test.classrooms", "classroom")
        .leftJoinAndSelect("classroom.school", "school")
        .where(new Brackets(qb => {
          if(userBody.category != pc.ADMINISTRADOR && userBody.category != pc.SUPERVISOR) {
            qb.where("classroom.id IN (:...teacherClasses)", { teacherClasses: teacherClasses.classrooms })
          }
        }))
        .andWhere("year.name = :yearName", { yearName })
        .andWhere("test.name LIKE :search", { search: `%${search}%` })
        .getMany();

      return { status: 200, data: testClasses };
    } catch (error: any) { return { status: 500, message: error.message } }
  }

  override async findOneById(testId: number | string, req: Request) {

    try {
      const teacher = await this.teacherByUser(req.body.user.user)

      const test = await AppDataSource.getRepository(Test)
        .findOne({
          relations: ["period", "period.year", "period.bimester", "discipline", "category", "person", "classrooms.school"],
          where: { id: Number(testId) },
        })

      if( teacher.person.id !== test?.person.id ) return { status: 403, message: "Você não tem permissão para editar esse teste." }

      if (!test) { return { status: 404, message: 'Data not found' } }

      const testQuestions = await AppDataSource.getRepository(TestQuestion)
        .createQueryBuilder("testQuestion")
        .select([
          "testQuestion.id",
          "testQuestion.order",
          "testQuestion.answer",
          "testQuestion.active",
          "question.id",
          "question.title",
          "descriptor.id",
          "descriptor.code",
          "descriptor.name",
          "topic.id",
          "topic.name",
          "topic.description",
          "classroomCategory.id",
          "classroomCategory.name",
          "questionGroup.id",
          "questionGroup.name",
        ])
        .leftJoin("testQuestion.question", "question")
        .leftJoin("question.descriptor", "descriptor")
        .leftJoin("descriptor.topic", "topic")
        .leftJoin("topic.classroomCategory", "classroomCategory")
        .leftJoin("testQuestion.questionGroup", "questionGroup")
        .where("testQuestion.test = :testId", { testId: test.id })
        .orderBy("questionGroup.id", "ASC")
        .addOrderBy("testQuestion.order", "ASC")
        .getMany();

      return { status: 200, data: { ...test, testQuestions } };
    } catch (error: any) { return { status: 500, message: error.message } }
  }

  override async save(body: DeepPartial<ObjectLiteral>, options: SaveOptions | undefined) {

    const classesIds = body.classroom.map((classroom: { id: number }) => classroom.id)

    try {
      const userPerson = await AppDataSource.getRepository(Person)
        .findOne({ where: { user: { id: body.user.user } } })

      const checkYear = await AppDataSource.getRepository(Year)
        .findOne({ where: { id: body.year.id } })

      if(!checkYear) return { status: 404, message: "Ano não encontrado" }
      if(!checkYear.active) return { status: 400, message: "Não é possível criar um teste para um ano letivo inativo." }

      const period = await AppDataSource.getRepository(Period)
        .findOne({ relations: ["year", "bimester"], where: { year: body.year, bimester: body.bimester } })
      if(!userPerson) return { status: 404, message: "Usuário inexistente" }
      if(!period) return { status: 404, message: "Period não encontrado" }

      const classes = await AppDataSource.getRepository(Classroom)
        .createQueryBuilder("classroom")
        .select(["classroom.id", "classroom.name", "classroom.shortName"])
        .leftJoin("classroom.studentClassrooms", "studentClassroom")
        .leftJoin('studentClassroom.year', 'year')
        .where("classroom.id IN (:...classesIds)", { classesIds })
        .andWhere('year.id = :yearId', { yearId: period.year.id })
        .andWhere("studentClassroom.startedAt < :testCreatedAt", { testCreatedAt: new Date() })
        .andWhere('studentClassroom.endedAt IS NULL')
        .groupBy("classroom.id, studentClassroom.id")
        .having("COUNT(studentClassroom.id) > 0")
        .getMany();

      if(!classes || classes.length < 1) return { status: 400, message: "Não existem alunos matriculados em uma ou mais salas informadas." }

      const newTest = await AppDataSource.getRepository(Test).save({
        name: body.name,
        category: body.category,
        discipline: body.discipline,
        person: userPerson,
        period: period,
        classrooms: classes,
        createdAt: new Date(),
      });

      const testQuestions = body.testQuestions.map((register: any) => ({ ...register, test: newTest }))
      await AppDataSource.getRepository(TestQuestion).save(testQuestions)

      return { status: 201, data: newTest };
    } catch (error: any) {
      return { status: 500, message: error.message }
    }
  }

  override async updateId(id: number | string, req: Request) {
    try {

      const teacher = await this.teacherByUser(req.body.user.user)

      const test = await AppDataSource.getRepository(Test)
        .findOne({
          relations: ["person"],
          where: { id: Number(id) }
        })

      if(!test) return { status: 404, message: "Teste não encontrado" }
      if( teacher.person.id !== test.person.id ) return { status: 403, message: "Você não tem permissão para editar esse teste." }

      test.name = req.body.name

      await AppDataSource.getRepository(Test).save(test)

      const testQuestions = req.body.testQuestions.map((register: any) => ({ ...register, test: test }))

      await AppDataSource.getRepository(TestQuestion).save(testQuestions)

      const result = (await this.findOneById(id, req)).data

      return { status: 200, data: result };
    } catch (error: any) { return { status: 500, message: error.message } }
  }

  override async deleteId(request: Request) {

    const testId = request.params.id
    const body = request.body

    try {

      const teacher = await this.teacherByUser(body.user.user)

      const test = await AppDataSource.getRepository(Test)
        .findOne({
          relations: ["person"],
          where: { id: Number(testId) }
        })
      if (!test) { return { status: 404, message: 'Data not found' } }

      if( teacher.person.id !== test.person.id ) return { status: 403, message: "Você não tem permissão para deletar esse teste." }

      // TODO: Only delete if there is no student with a test result

      await AppDataSource.getRepository(TestQuestion)
        .createQueryBuilder()
        .delete()
        .from(TestQuestion)
        .where("test = :testId", { testId })
        .execute();

      const result = await AppDataSource.getRepository(Test)
        .createQueryBuilder()
        .delete()
        .from(Test)
        .where("id = :testId", { testId })
        .execute();

      return { status: 200, data: result };
    } catch (error: any) { return { status: 500, message: error.message } }
  }

  async getTest(testId:number , yearName: number) {
    return await AppDataSource.getRepository(Test)
      .createQueryBuilder("test")
      .leftJoinAndSelect("test.person", "person")
      .leftJoinAndSelect("test.period", "period")
      .leftJoinAndSelect("period.bimester", "bimester")
      .leftJoinAndSelect("period.year", "year")
      .leftJoinAndSelect("test.discipline", "discipline")
      .leftJoinAndSelect("test.category", "category")
      .where("test.id = :testId", {testId})
      .andWhere("year.name = :yearName", {yearName})
      .getOne()
  }
}

export const testController = new TestController();

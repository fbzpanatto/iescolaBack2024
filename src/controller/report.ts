import {GenericController} from "./genericController";
import {Brackets, EntityManager, EntityTarget} from "typeorm";
import {Test} from "../model/Test";
import {AppDataSource} from "../data-source";
import {StudentClassroom} from "../model/StudentClassroom";
import {TestQuestion} from "../model/TestQuestion";
import {Request} from "express";
import {QuestionGroup} from "../model/QuestionGroup";
import {School} from "../model/School";
import {pc} from "../utils/personCategories";
import {TEST_CATEGORIES_IDS} from "../utils/testCategory";
import {testController} from "./test";
import {Year} from "../model/Year";

class ReportController extends GenericController<EntityTarget<Test>> {
  constructor() { super(Test) }

  async getSchoolAvg(request: Request) {
    try {
      const response = (await this.getReport(request) as any).data;
      if (!response) return { status: 404, message: "Teste não encontrado" };
      const schools = response.schools as { id: number; name: string; shortName: string; qRate: ({ id: number; rate: string } | { id: number; rate: number })[]}[]
      const schoolAvg = schools.map((school) => ({ ...school, qRate: school.qRate.reduce((acc, curr) => curr.rate === "N/A" ? acc : acc + Number(curr.rate), 0) / school.qRate.filter((q) => q.rate !== "N/A").length}));
      return { status: 200, data: { ...response, schoolAvg } };
    } catch (error: any) { return { status: 500, message: error.message } }
  }

  async getReport(request: Request, CONN?: EntityManager) {

    try {
      if(!CONN) { return await AppDataSource.transaction(async(CONN) => { return await this.wrapper(CONN, request?.params.id, request?.params.year)})}
      return await this.wrapper(CONN, request?.params.id, request?.params.year)
    } catch (error: any) { return { status: 500, message: error.message } }
  }

  async getTestQuestions(testId: number, CONN: EntityManager) {
    return await CONN.getRepository(TestQuestion)
      .createQueryBuilder("testQuestion")
      .leftJoinAndSelect("testQuestion.question", "question")
      .leftJoinAndSelect("testQuestion.questionGroup", "questionGroup")
      .leftJoin("testQuestion.test", "test")
      .where("testQuestion.test = :testId", { testId })
      .orderBy("questionGroup.id", "ASC")
      .addOrderBy("testQuestion.order", "ASC")
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

  async reportFindAll(request: Request) {

    const limit =  !isNaN(parseInt(request.query.limit as string)) ? parseInt(request.query.limit as string) : 100
    const offset =  !isNaN(parseInt(request.query.offset as string)) ? parseInt(request.query.offset as string) : 0

    try {
      return await AppDataSource.transaction(async(CONN) => {
        const uTeacher = await this.teacherByUser(request?.body.user.user, CONN);
        const teacherClasses = await this.teacherClassrooms(request?.body.user, CONN);
        const masterUser = uTeacher.person.category.id === pc.ADMN || uTeacher.person.category.id === pc.SUPE || uTeacher.person.category.id === pc.FORM;
        const testClasses = await CONN.getRepository(Test)
          .createQueryBuilder("test")
          .leftJoinAndSelect("test.person", "person")
          .leftJoinAndSelect("test.period", "period")
          .leftJoinAndSelect("period.bimester", "bimester")
          .leftJoinAndSelect("period.year", "year")
          .leftJoinAndSelect("test.category", "category")
          .leftJoinAndSelect("test.discipline", "discipline")
          .leftJoinAndSelect("test.classrooms", "classroom")
          .leftJoin("classroom.school", "school")
          .where( new Brackets((qb) => { if (!masterUser) { qb.where("classroom.id IN (:...teacherClasses)", { teacherClasses: teacherClasses.classrooms })}}))
          .andWhere("year.name = :yearName", { yearName: request.params.year as string })
          .andWhere("test.name LIKE :search", { search: `%${ request.query.search as string }%` })
          .take(limit)
          .skip(offset)
          .getMany();
        return { status: 200, data: testClasses };
      })
    } catch (error: any) { return { status: 500, message: error.message } }
  }

  async wrapper(CONN: EntityManager, testId: string, yearName: string) {

    let data;

    const test = await CONN.getRepository(Test)
      .createQueryBuilder("test")
      .leftJoinAndSelect("test.period", "period")
      .leftJoinAndSelect("period.bimester", "periodBimester")
      .leftJoinAndSelect("period.year", "periodYear")
      .leftJoinAndSelect("test.discipline", "discipline")
      .leftJoinAndSelect("test.category", "category")
      .leftJoinAndSelect("test.person", "testPerson")
      .where("test.id = :testId", { testId })
      .andWhere("periodYear.name = :yearName", { yearName })
      .getOne();

    if (!test) return { status: 404, message: "Teste não encontrado" };

    switch (test.category.id) {
      case(TEST_CATEGORIES_IDS.LITE): {
        break;
      }
      case(TEST_CATEGORIES_IDS.READ): {

        const year = await CONN.findOneBy(Year, { name: yearName })

        if(!year) return { status: 404, message: "Ano não encontrado." }

        const yearId = year.id.toString()
        const headers = await testController.getReadingFluencyHeaders(CONN)
        const fluencyHeaders = testController.readingFluencyHeaders(headers)

        const schools = await CONN.getRepository(School)
          .createQueryBuilder("school")
          .leftJoinAndSelect("school.classrooms", "classroom")
          .leftJoinAndSelect("classroom.studentClassrooms", "studentClassroom")
          .leftJoin("studentClassroom.year", "studentClassroomYear")
          .leftJoin("studentClassroom.studentStatus", "studentStatus")
          .leftJoin("studentStatus.test", "studentStatusTest")
          .leftJoinAndSelect("studentClassroom.readingFluency", "readingFluency")
          .leftJoinAndSelect("readingFluency.readingFluencyExam", "readingFluencyExam")
          .leftJoinAndSelect("readingFluency.readingFluencyLevel", "readingFluencyLevel")
          .where("studentClassroomYear.id = :yearId", { yearId })
          .andWhere("readingFluency.test = :testId", { testId })
          .andWhere("studentStatusTest.id = :testId", { testId })
          .getMany()

        data = {...test, fluencyHeaders, schools}

        break;
      }
      case (TEST_CATEGORIES_IDS.TEST): {

        const testQuestions = await this.getTestQuestions(Number(testId), CONN);
        if (!testQuestions) return { status: 404, message: "Questões não encontradas" };

        const testQuestionsIds = testQuestions.map((testQuestion) => testQuestion.id );
        const questionGroups = await this.getTestQuestionsGroups(Number(testId), CONN);

        const schools = await CONN.getRepository(School)
          .createQueryBuilder("school")
          .leftJoinAndSelect("school.classrooms", "classroom")
          .leftJoinAndSelect("classroom.studentClassrooms", "studentClassroom")
          .leftJoinAndSelect("studentClassroom.studentStatus", "studentStatus")
          .leftJoinAndSelect("studentStatus.test", "studentStatusTest")
          .leftJoinAndSelect("studentClassroom.studentQuestions", "studentQuestions",)
          .leftJoinAndSelect("studentQuestions.testQuestion", "testQuestion", "testQuestion.id IN (:...testQuestions)", { testQuestions: testQuestionsIds },)
          .leftJoin("testQuestion.test", "test")
          .leftJoin("studentClassroom.year", "year")
          .where("year.name = :yearName", { yearName })
          .andWhere("test.id = :testId", { testId })
          .andWhere("studentStatusTest.id = :testId", { testId })
          .andWhere( new Brackets((qb) => { qb.where("studentClassroom.startedAt < :testCreatedAt", { testCreatedAt: test.createdAt,});qb.orWhere("studentQuestions.id IS NOT NULL")}))
          .getMany();

        const simplifiedSchools = schools.map((school) => ({
          ...school,
          studentClassrooms: school.classrooms.flatMap((classroom) =>
            classroom.studentClassrooms.map((studentClassroom) => ({
              ...studentClassroom,
              studentQuestions: studentClassroom.studentQuestions.map((studentQuestion) => {
                const testQuestion = testQuestions.find((tq) => tq.id === studentQuestion.testQuestion.id );
                const score = studentQuestion.answer.length === 0 ? 0 : testQuestion?.answer.includes(studentQuestion.answer.toUpperCase() ) ? 1 : 0;
                return { ...studentQuestion, score };
              }),
            })) as StudentClassroom[],
          )
        }))

        const simplifiedArray = simplifiedSchools.map((school) => {
          const { id, name, shortName } = school;
          const qRate = testQuestions.map((testQuestion) => {
            if (!testQuestion.active) { return { id: testQuestion.id, rate: "N/A" } }
            let sum = 0;
            let count = 0;
            school.studentClassrooms
              .filter((studentClassroom) => studentClassroom.studentStatus.find((register) => register.test.id === test.id )?.active,)
              .filter((studentClassroom) => !studentClassroom.studentQuestions.every(el => el.answer === ''))
              .flatMap((studentClassroom) => studentClassroom.studentQuestions)
              .filter((studentQuestion) => studentQuestion.testQuestion.id === testQuestion.id )
              .forEach((studentQuestion) => {
                const studentQuestionAny = studentQuestion as any;
                sum += studentQuestionAny.score;
                count += 1;
              })
            return { id: testQuestion.id, rate: count === 0 ? 0 : (sum / count) * 100 };
          })
          return { id, name, shortName, qRate };
        })

        simplifiedArray.sort((a, b) => {
          const totalA = a.qRate.reduce((acc, curr) => (curr.rate === "N/A" ? acc : acc + Number(curr.rate)), 0,)
          const totalB = b.qRate.reduce((acc, curr) => (curr.rate === "N/A" ? acc : acc + Number(curr.rate)), 0 )
          return totalB - totalA;
        })

        data = {...test, testQuestions, questionGroups, schools: simplifiedArray }

        break;
      }
    }

    return { status: 200, data }
  }
}

export const reportController = new ReportController();

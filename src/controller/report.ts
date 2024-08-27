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
import {Classroom} from "../model/Classroom";

class ReportController extends GenericController<EntityTarget<Test>> {
  constructor() { super(Test) }

  async getSchoolAvg(request: Request) {
    try {
      return await AppDataSource.transaction(async(CONN) => {

        let data;
        const response = (await this.getReport(request, CONN) as any).data;
        if (!response) return { status: 404, message: "Teste não encontrado" };
        switch (response.category.id) {
          case(TEST_CATEGORIES_IDS.LITE_1):
          case(TEST_CATEGORIES_IDS.LITE_2):
          case(TEST_CATEGORIES_IDS.LITE_3): {
            data = { ...response }
            break;
          }
          case(TEST_CATEGORIES_IDS.TEST_4_9): {
            const schools = response.schools as { id: number; name: string; shortName: string; qRate: ({ id: number; rate: string } | { id: number; rate: number })[]}[]
            const schoolAvg = schools.map((school) => ({ ...school, qRate: school.qRate.reduce((acc, curr) => curr.rate === "N/A" ? acc : acc + Number(curr.rate), 0) / school.qRate.filter((q) => q.rate !== "N/A").length}));
            data = { ...response, schoolAvg }
            break;
          }
        }
        return { status: 200, data };
      })
    } catch (error: any) { return { status: 500, message: error.message } }
  }

  async getAllAlphabeticSchool(test: Test, yearId: number | string, CONN: EntityManager) {
    return await CONN.getRepository(School)
      .createQueryBuilder("school")
      .leftJoinAndSelect("school.classrooms", "classroom")
      .leftJoinAndSelect("classroom.studentClassrooms", "studentClassroom")
      .leftJoinAndSelect("studentClassroom.classroom", "currClassroom")
      .leftJoinAndSelect("studentClassroom.student", "student")
      .leftJoinAndSelect("student.person", "person")
      .leftJoinAndSelect("student.alphabetic", "alphabetic")
      .leftJoinAndSelect("alphabetic.rClassroom", "rClassroom")
      .leftJoinAndSelect("alphabetic.alphabeticLevel", "alphabeticLevel")
      .leftJoinAndSelect("alphabetic.test", "test")
      .leftJoinAndSelect("test.category", "testCategory")
      .leftJoinAndSelect("test.period", "period")
      .leftJoinAndSelect("period.year", "year")
      .leftJoinAndSelect("period.bimester", "bimester")
      .where("testCategory.id = :testCategory", { testCategory: test.category.id })
      .andWhere("year.id = :yearId", { yearId })
      .andWhere("alphabetic.test = test.id")
      .andWhere("alphabeticLevel.id IS NOT NULL")
      .orderBy("school.name", "ASC")
      .getMany();
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
      case(TEST_CATEGORIES_IDS.LITE_1):
      case(TEST_CATEGORIES_IDS.LITE_2):
      case(TEST_CATEGORIES_IDS.LITE_3): {

        const year = await CONN.findOneBy(Year, { name: yearName })
        if(!year) return { status: 404, message: "Ano não encontrado." }
        const yearId = year.id.toString()
        const headers = await testController.alphabeticHeaders(year.name, CONN)

        const schools = await this.getAllAlphabeticSchool(test, yearId, CONN)

        const entryPoint = {
          id: 99,
          name: test.name,
          person: { name: test.person.name },
          category: { id: test.category.id, name: test.category.name },
          discipline: { name: test.discipline.name },
          period: { bimester: { name: 'TODOS' }, year }
        }

        const totalCityHallColumn: { total: number, bimesterId: number, levelId: number }[] = []
        const examTotalCityHall = headers.reduce((acc, prev) => { const key = prev.id; if (!acc[key]) { acc[key] = 0; } return acc }, {} as Record<number, number>);

        const allSchools = schools.reduce((acc: { id: number, name: string, shortName: string, percentTotalByColumn: number[] }[], school) => {

          const mappedArr = school.classrooms.flatMap(classroom => classroom.studentClassrooms.map(el => ({ currentClassroom: el.classroom.id, alphabetic: el.student.alphabetic })))

          let totalNuColumn: {  total: number, bimesterId: number }[] = [];
          const percentColumn = headers.reduce((acc, prev) => { const key = prev.id; if (!acc[key]) { acc[key] = 0; } return acc }, {} as Record<number, number>);

          for (let bimester of headers) {
            for (let level of bimester.levels) {
              const count = mappedArr.reduce((acc, el) => {
                return acc + el.alphabetic.reduce((sum, prev) => {
                  const sameClassroom = el.currentClassroom === prev.rClassroom.id;
                  const isMatchingBimester = prev.test.period.bimester.id === bimester.id;
                  const isMatchingLevel = prev.alphabeticLevel?.id === level.id;

                  return sum + (sameClassroom && isMatchingBimester && isMatchingLevel ? 1 : 0);
                }, 0);
              }, 0);

              totalNuColumn.push({ total: count, bimesterId: bimester.id });

              const cityHallColumn = totalCityHallColumn.find(el => el.bimesterId === bimester.id && el.levelId === level.id)
              if(!cityHallColumn) { totalCityHallColumn.push({ total: count, bimesterId: bimester.id, levelId: level.id })}
              else { cityHallColumn.total += count }

              percentColumn[bimester.id] += count;
              examTotalCityHall[bimester.id] += count
            }
          }

          const percentTotalByColumn = totalNuColumn.map(el => Math.round((el.total / percentColumn[el.bimesterId]) * 100));

          acc.push({ id: school.id, name: school.name, shortName: school.shortName, percentTotalByColumn })

          return acc;
        }, []);

        const cityHall = {
          id: 99,
          name: 'PREFEITURA DO MUNICÍPIO DE ITATIBA',
          shortName: 'ITATIBA',
          percentTotalByColumn: totalCityHallColumn.map(item => item.total = Math.round((item.total / examTotalCityHall[item.bimesterId]) * 100))
        }

        data = {...entryPoint, alphabeticHeaders: headers, schools: [ ...allSchools, cityHall ] }

        break;
      }
      case(TEST_CATEGORIES_IDS.READ_2):
      case(TEST_CATEGORIES_IDS.READ_3): {

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

        const totalCityHallColumn: any[] = []
        const examTotalCityHall = headers.reduce((acc, prev) => { const key = prev.readingFluencyExam.id; if(!acc[key]) { acc[key] = 0 } return acc }, {} as any)

        const allSchools = schools.reduce((acc: { id: number, name: string, percentTotalByColumn: number[] }[], school) => {

          let totalNuColumn: any[] = []
          const percentColumn = headers.reduce((acc, prev) => { const key = prev.readingFluencyExam.id; if(!acc[key]) { acc[key] = 0 } return acc }, {} as any)

          for(let header of headers) {
            const el = school.classrooms.flatMap(el => el.studentClassrooms.flatMap(obj => obj.readingFluency)).filter(el => el.readingFluencyExam.id === header.readingFluencyExam.id && el.readingFluencyLevel?.id === header.readingFluencyLevel.id)
            const value = el.length ?? 0
            totalNuColumn.push({ total: value, divideByExamId: header.readingFluencyExam.id })

            const cityHallColumn = totalCityHallColumn.find(el => el.readingFluencyExamId === header.readingFluencyExam.id && el.readingFluencyLevelId === header.readingFluencyLevel.id)
            if(!cityHallColumn) { totalCityHallColumn.push({ total: value, readingFluencyExamId: header.readingFluencyExam.id, readingFluencyLevelId: header.readingFluencyLevel.id })}
            else { cityHallColumn.total += value }

            percentColumn[header.readingFluencyExam.id] += value
            examTotalCityHall[header.readingFluencyExam.id] += value
          }
          const percentTotalByColumn = totalNuColumn.map((el: any) => Math.round((el.total / percentColumn[el.divideByExamId]) * 100))

          acc.push({ id: school.id, name: school.name, percentTotalByColumn })

          return acc
        }, [])

        const cityHall = {
          id: 99,
          name: 'PREFEITURA DO MUNICÍPIO DE ITATIBA',
          percentTotalByColumn: totalCityHallColumn.map(item => item.total = Math.round((item.total / examTotalCityHall[item.readingFluencyExamId]) * 100))
        }

        data = {...test, fluencyHeaders, schools: [...allSchools, cityHall] }

        break;
      }
      case (TEST_CATEGORIES_IDS.TEST_4_9): {

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

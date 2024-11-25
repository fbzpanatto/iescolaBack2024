import { GenericController } from "./genericController";
import { Brackets, EntityManager, EntityTarget } from "typeorm";
import { Test } from "../model/Test";
import { AppDataSource } from "../data-source";
import { TestQuestion } from "../model/TestQuestion";
import { Request } from "express";
import { QuestionGroup } from "../model/QuestionGroup";
import { School } from "../model/School";
import { pc } from "../utils/personCategories";
import { TEST_CATEGORIES_IDS } from "../utils/testCategory";
import { AlphaHeaders, testController } from "./test";
import { Year } from "../model/Year";
import { dbConn } from "../services/db";
import { PoolConnection } from "mysql2/promise";

class ReportController extends GenericController<EntityTarget<Test>> {
  constructor() { super(Test) }

  async getSchoolAvg(request: Request) {
    try {
      return await AppDataSource.transaction(async(CONN) => {

        const data = (await this.getReport(request, CONN) as any).data;
        if (!data) return { status: 404, message: "Teste não encontrado" };
        return { status: 200, data };
      })
    } catch (error: any) { return { status: 500, message: error.message } }
  }

  async getReport(request: Request, CONN?: EntityManager) {

    let sqlConnection = await dbConn()

    try {
      if(!CONN) { return await AppDataSource.transaction(async(CONN) => { return await this.wrapper(CONN, sqlConnection, request?.params.id, request?.params.year)})}
      return await this.wrapper(CONN, sqlConnection, request?.params.id, request?.params.year)
    } catch (error: any) {
      console.log('error', error)
      return { status: 500, message: error.message }
    } finally { if (sqlConnection) { sqlConnection.release() } }
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
        const teacherClasses = await this.tClassrooms(request?.body.user, CONN);
        const masterUser = uTeacher.person.category.id === pc.ADMN || uTeacher.person.category.id === pc.SUPE || uTeacher.person.category.id === pc.FORM;

        const subQuery = CONN.getRepository(Test)
          .createQueryBuilder("t")
          .select("MIN(t.id)")
          .where("t.category.id IN (1, 2, 3)")
          .groupBy("t.category.id");

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
          .where( new Brackets((qb) => { if (!masterUser) { qb.where("classroom.id IN (:...teacherClasses)", { teacherClasses: teacherClasses.classrooms })}}))
          .andWhere(new Brackets(qb => {
            qb.where("test.category.id NOT IN (1, 2, 3)")
              .orWhere(`test.id IN (${subQuery.getQuery()})`);
          }))
          .setParameters(subQuery.getParameters())
          .andWhere("year.name = :yearName", { yearName: request.params.year as string })
          .andWhere("test.name LIKE :search", { search: `%${ request.query.search as string }%` })
          .take(limit)
          .skip(offset)
          .getMany();

        const alphaCategories = [TEST_CATEGORIES_IDS.LITE_1, TEST_CATEGORIES_IDS.LITE_2, TEST_CATEGORIES_IDS.LITE_3]

        const mappedResult = testClasses.map(el => {
          if(alphaCategories.includes(el.category.id)) { el.period.bimester.name = 'TODOS'; return el }
          return el
        })

        return { status: 200, data: mappedResult };
      })
    } catch (error: any) { return { status: 500, message: error.message } }
  }

  async wrapper(CONN: EntityManager, sqlConnection: PoolConnection, testId: string, yearName: string) {

    let data;

    const testQueryResult = await this.testQuery(sqlConnection, testId, yearName)
    if (!testQueryResult) return { status: 404, message: "Teste não encontrado" };

    switch (testQueryResult?.test_category_id) {
      case(TEST_CATEGORIES_IDS.LITE_1):
      case(TEST_CATEGORIES_IDS.LITE_2):
      case(TEST_CATEGORIES_IDS.LITE_3): {

        if(!testQueryResult?.year_id) return { status: 404, message: "Ano não encontrado." }

        let headers = await testController.alphaHeaders(testQueryResult?.year_name, CONN) as AlphaHeaders[]

        const tests = await testController.alphabeticTests(testQueryResult?.year_name, testQueryResult, CONN)

        let schools;
        let testQuestionsIds: number[] = []

        if(testQueryResult.test_category_id != TEST_CATEGORIES_IDS.LITE_1) {
          for(let test of tests) {

            const fields = ["testQuestion.id", "testQuestion.order", "testQuestion.answer", "testQuestion.active", "question.id", "questionGroup.id", "questionGroup.name"]
            const testQuestions = await testController.getTestQuestions(testQueryResult?.id, CONN, fields)

            test.testQuestions = testQuestions
            testQuestionsIds = [ ...testQuestionsIds, ...testQuestions.map(testQuestion => testQuestion.id) ]
          }
        }

        headers = headers.map(bi => { return { ...bi, testQuestions: tests.find(test => test.period.bimester.id === bi.id)?.testQuestions } })

        let preResult = await testController.alphaQuestions(testQueryResult.year_name, testQueryResult, testQuestionsIds, CONN)

        let mappedSchools = preResult.map(school => {
          const element = { id: school.id, name: school.name, shortName: school.shortName, school: school.name, totals: headers.map(h => ({ ...h, bimesterCounter: 0 }))}
          return { ...element, totals: testController.aggregateResult(element, testController.alphaAllClasses23(school.classrooms, headers)) }
        })

        const cityHallName = 'PREFEITURA DO MUNICÍPIO DE ITATIBA'
        const cityHall = { id: 999, name: cityHallName, shortName: 'ITATIBA', school: cityHallName, totals: headers.map(h => ({ ...h, bimesterCounter: 0 })) }

        cityHall.totals = testController.aggregateResult(cityHall, testController.alphaAllClasses23(preResult.flatMap(school => school.classrooms), headers))

        schools = [ ...mappedSchools, cityHall ]

        const test = { id: 99, name: testQueryResult.name, category: { id: testQueryResult.test_category_id, name: testQueryResult.test_category_name }, discipline: { name: testQueryResult.discipline_name }, period: { bimester: { name: 'TODOS' }, year: { id: testQueryResult.year_id, name: testQueryResult.year_name, active: testQueryResult.year_active } } }

        data = { alphabeticHeaders: headers, ...test, schools }

        break;
      }

      case(TEST_CATEGORIES_IDS.READ_2):
      case(TEST_CATEGORIES_IDS.READ_3): {

        let formatedTest = {
          id: testQueryResult.id,
          name: testQueryResult.name,
          category: { id: testQueryResult.test_category_id, name: testQueryResult.test_category_name },
          period: {
            id: testQueryResult.period_id,
            bimester: { id: testQueryResult.bimester_id, name: testQueryResult.bimester_name, testName: testQueryResult.bimester_testName },
            year: { id: testQueryResult.year_id, name: testQueryResult.year_name }
          },
          discipline: { id: testQueryResult.discipline_id, name: testQueryResult.discipline_name },
        }

        const qYear = await this.qYearByName(sqlConnection, yearName)

        if(!qYear) return { status: 404, message: "Ano não encontrado." }

        const headers = await testController.getRfluencyHeaders(CONN)
        const fluencyHeaders = testController.readingFluencyHeaders(headers)

        let localSchools = await this.qSchools(sqlConnection, Number(testId))

        for(let school of localSchools) {

          school.classrooms = await this.qClassroomsByTestId(sqlConnection, school.id, Number(testId))

          for(let classroom of school.classrooms) {

            classroom.studentsClassrooms = testController
              .qDuplicatedStudents(await this.qStudentClassrooms(sqlConnection, classroom.id, qYear.id))
              .filter((el:any) => !el.ignore)

            for(let studentClassroom of classroom.studentsClassrooms) {

              studentClassroom.readingFluency = await this.qReadingFluency(sqlConnection, Number(testId), studentClassroom.studentId)

            }
          }
        }

        const totalCityHallColumn: any[] = []
        const examTotalCityHall = headers.reduce((acc, prev) => { const key = prev.readingFluencyExam.id; if(!acc[key]) { acc[key] = 0 } return acc }, {} as any)

        const localSchoolsAllSchools = localSchools.reduce((acc: { id: number, name: string, shortName: string, percentTotalByColumn: number[] }[], school) => {

          let totalNuColumn: any[] = []
          const percentColumn = headers.reduce((acc, prev) => { const key = prev.readingFluencyExam.id; if(!acc[key]) { acc[key] = 0 } return acc }, {} as any)

          for(let hD of headers) {

            const studentClassrooms = school.classrooms.flatMap(el =>
              el.studentsClassrooms.flatMap(item =>
                item.readingFluency?.filter(rD =>
                  item.classroomId === rD.rClassroomId &&
                  rD.readingFluencyExamId === hD.readingFluencyExam.id &&
                  rD.readingFluencyLevelId === hD.readingFluencyLevel.id
                )
              )
            )

            const value = studentClassrooms.length ?? 0
            totalNuColumn.push({ total: value, divideByExamId: hD.readingFluencyExam.id })

            const cityHallColumn = totalCityHallColumn.find(el => el.readingFluencyExamId === hD.readingFluencyExam.id && el.readingFluencyLevelId === hD.readingFluencyLevel.id)
            if(!cityHallColumn) { totalCityHallColumn.push({ total: value, readingFluencyExamId: hD.readingFluencyExam.id, readingFluencyLevelId: hD.readingFluencyLevel.id })}
            else { cityHallColumn.total += value }

            percentColumn[hD.readingFluencyExam.id] += value
            examTotalCityHall[hD.readingFluencyExam.id] += value
          }

          const percentTotalByColumn = totalNuColumn.map((el: any) => Math.floor((el.total / percentColumn[el.divideByExamId]) * 10000) / 100)

          acc.push({ id: school.id, name: school.name, shortName: school.shortName, percentTotalByColumn })

          return acc
        }, [])

        const cityHall = {
          id: 999,
          name: 'PREFEITURA DO MUNICÍPIO DE ITATIBA',
          shortName: 'ITATIBA',
          percentTotalByColumn: totalCityHallColumn.map(item => item.total = Math.floor((item.total / examTotalCityHall[item.readingFluencyExamId]) * 10000) / 100)
        }

        data = { ...formatedTest, fluencyHeaders, schools: [...localSchoolsAllSchools, cityHall], localSchools }

        break;
      }

      case(TEST_CATEGORIES_IDS.AVL_ITA):
      case(TEST_CATEGORIES_IDS.TEST_4_9): {

        let formatedTest = {
          id: testQueryResult.id,
          name: testQueryResult.name,
          category: { id: testQueryResult.test_category_id, name: testQueryResult.test_category_name },
          period: {
            id: testQueryResult.period_id,
            bimester: { id: testQueryResult.bimester_id, name: testQueryResult.bimester_name, testName: testQueryResult.bimester_testName },
            year: { id: testQueryResult.year_id, name: testQueryResult.year_name }
          },
          discipline: { id: testQueryResult.discipline_id, name: testQueryResult.discipline_name },
        }

        const year = await CONN.findOne(Year, { where: { name: yearName } })
        if (!year) return { status: 404, message: "Ano não encontrado." }

        const testQuestions = await testController.getTestQuestionsSimple(testId, CONN)
        if (!testQuestions) return { status: 404, message: "Questões não encontradas" }
        const testQuestionsIds = testQuestions.map(testQuestion => testQuestion.id)

        const questionGroups = await this.getTestQuestionsGroups(Number(testId), CONN);
        const preResult = await this.getTestForGraphic(testId, testQuestionsIds, year, CONN)

        let answersLetters: { letter: string, questions: { id: number, order: number, occurrences: number, percentage: number }[] }[] = []

        const schools = preResult
          .filter(s => s.classrooms.some(c => c.studentClassrooms.some(sc => sc.student.studentQuestions.some(sq => sq.answer.length > 0))))
          .map(s => {

            let filtered = s.classrooms.flatMap(c => c.studentClassrooms.filter(sc => sc.student.studentQuestions.some(sq => sq.answer.length > 0 && sq.rClassroom.id === c.id)))

            const studentCount = filtered.reduce((acc, item) => {
              acc[item.student.id] = (acc[item.student.id] || 0) + 1;
              return acc;
            }, {} as Record<number, number>);

            const duplicatedStudentIds = new Set<number>();

            for(let item of filtered) {
              if (studentCount[item.student.id] > 1 && item.endedAt) { duplicatedStudentIds.add(item.id) }
            }

            filtered = filtered
              .map(item => duplicatedStudentIds.has(item.id) ? { ...item, ignore: true } : item)
              .filter((item: any) => !item.ignore);


            return { id: s.id, name: s.name, shortName: s.shortName, schoolId: s.id,
              totals: testQuestions.map(tQ => {

                if(!tQ.active) {
                  return { id: tQ.id, order: tQ.order, tNumber: 0, tPercent: 0, tRate: 0 }
                }

                const sQuestions = filtered.flatMap(sc =>
                  sc.student.studentQuestions.filter(sq => {

                    const isValid = sq.id && sq.testQuestion.id === tQ.id && sq.answer.length > 0 && sq.rClassroom?.id === sc.classroom.id;
                    if (!isValid) return false;

                    const letter = sq.answer.trim().length ? sq.answer.toUpperCase().trim() : 'VAZIO';

                    let ltItem = answersLetters.find(el => el.letter === letter);
                    if (!ltItem) { ltItem = { letter, questions: [] }; answersLetters.push(ltItem) }

                    let letterOccurrences = ltItem.questions.find(obj => obj.id === tQ.id && obj.order === tQ.order);
                    if (!letterOccurrences) {
                      letterOccurrences = { id: tQ.id, order: tQ.order, occurrences: 0, percentage: 0 };
                      ltItem.questions.push(letterOccurrences);
                    }

                    letterOccurrences.occurrences += 1;

                    return true
                  })
                )

                const totalSq = sQuestions.filter(sq => tQ.answer?.includes(sq.answer.toUpperCase()))

                const total = filtered.length;
                const matchedQuestions = totalSq.length;
                const tRate = matchedQuestions > 0 ? Math.floor((matchedQuestions / total) * 10000) / 100 : 0;

                return { id: tQ.id, order: tQ.order, tNumber: matchedQuestions, tPercent: total, tRate }
              })
            }
          })

        let allResults: { id: number, order: number, tNumber: number, tPercent: number, tRate: number }[] = []
        const totalSchoolsResults = schools.flatMap(el => el.totals)
        for(let item of totalSchoolsResults) {
          const index = allResults.findIndex(x => x.id === item.id)
          const element = allResults[index]
          if(!element) {
            allResults.push({ id: item.id, order: item.order, tNumber: item.tNumber, tPercent: item.tPercent, tRate: item.tRate })
          } else {
            element.tNumber += item.tNumber
            element.tPercent += item.tPercent
            element.tRate = Math.floor((element.tNumber / element.tPercent) * 10000) / 100;
          }
        }

        const cityHall = { id: 999, name: 'PREFEITURA DO MUNICÍPIO DE ITATIBA', shortName: 'ITATIBA', totals: allResults }

        const firstElement = cityHall.totals[0].tPercent;

        answersLetters = answersLetters.map(el => ({
          ...el,
          questions: el.questions.map(question => ({
            ...question,
            percentage: firstElement > 0 ? Math.floor((question.occurrences / firstElement) * 10000) / 100 : 0
          }))
        }))

        data = { ...formatedTest, schools: [...schools, cityHall], testQuestions, questionGroups, answersLetters };

        break;
      }
    }
    return { status: 200, data }
  }

  async getTestForGraphic(testId: string, testQuestionsIds: number[], year: Year,  CONN: EntityManager) {
    return await CONN.getRepository(School)
      .createQueryBuilder("school")
      .leftJoinAndSelect("school.classrooms", "classroom")
      .leftJoinAndSelect("classroom.studentClassrooms", "studentClassroom")
      .leftJoinAndSelect("studentClassroom.classroom", "studentClassroomClassroom")
      .leftJoin("studentClassroom.year", "studentClassroomYear")
      .leftJoinAndSelect("studentClassroom.student", "student")
      .leftJoinAndSelect("student.studentQuestions", "studentQuestions")
      .leftJoinAndSelect("studentQuestions.rClassroom", "rClassroom")
      .leftJoinAndSelect("studentQuestions.testQuestion", "testQuestion", "testQuestion.id IN (:...testQuestions)", { testQuestions: testQuestionsIds })
      .leftJoinAndSelect("testQuestion.questionGroup", "questionGroup")
      .leftJoinAndSelect("testQuestion.test", "test")
      .leftJoinAndSelect("test.period", "period")
      .leftJoinAndSelect("period.year", "periodYear")
      .where("test.id = :testId", { testId })
      .andWhere("studentClassroomYear.id = :yearId", { yearId: year.id })
      .andWhere("periodYear.id = :yearId", { yearId: year.id })
      .orderBy("questionGroup.id", "ASC")
      .addOrderBy("testQuestion.order", "ASC")
      .getMany()
  }
}

export const reportController = new ReportController();

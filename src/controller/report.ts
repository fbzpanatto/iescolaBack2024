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
import { testController } from "./test";
import { AlphaHeaders } from "../interfaces/interfaces";
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
      if(!CONN) {
        return await AppDataSource.transaction(async(CONN) => {
          return await this.wrapper(CONN, sqlConnection, request?.params.id, request?.params.year)
        })
      }
      return await this.wrapper(CONN, sqlConnection, request?.params.id, request?.params.year)
    } catch (error: any) {
      console.log('error', error)
      return { status: 500, message: error.message }
    } finally { if (sqlConnection) { sqlConnection.release() } }
  }

  async getTestQuestionsGroups(testId: number, CONN: EntityManager) {
    // TODO: MAKE MYSQL2
    return await CONN.getRepository(QuestionGroup)
      .createQueryBuilder("questionGroup")
      .select(["questionGroup.id AS id", "questionGroup.name AS name"])
      .addSelect("COUNT(testQuestions.id)", "questionsCount")
      .leftJoin("questionGroup.testQuestions", "testQuestions")
      .where("testQuestions.test = :testId", { testId })
      .groupBy("questionGroup.id")
      .getRawMany();
  }

  async reportFindAll(req: Request) {

    const limit =  !isNaN(parseInt(req.query.limit as string)) ? parseInt(req.query.limit as string) : 100
    const offset =  !isNaN(parseInt(req.query.offset as string)) ? parseInt(req.query.offset as string) : 0
    const bimesterId = !isNaN(parseInt(req.query.bimester as string)) ? parseInt(req.query.bimester as string) : null
    const disciplineId = !isNaN(parseInt(req.query.discipline as string)) ? parseInt(req.query.discipline as string) : null

    let sqlConnection = await dbConn()

    try {
      return await AppDataSource.transaction(async(CONN) => {

        const teacher = await this.qTeacherByUser(sqlConnection, req.body.user.user)
        const teacherClasses = await this.qTeacherClassrooms(sqlConnection, req?.body.user.user)
        const masterUser = teacher.person.category.id === pc.ADMN || teacher.person.category.id === pc.SUPE || teacher.person.category.id === pc.FORM;

        // TODO: MAKE MYSQL2
        let data = await CONN.getRepository(Test)
          .createQueryBuilder("test")
          .leftJoinAndSelect("test.person", "person")
          .leftJoinAndSelect("test.period", "period")
          .leftJoinAndSelect("test.category", "category")
          .leftJoinAndSelect("period.year", "year")
          .leftJoinAndSelect("period.bimester", "bimester")
          .leftJoinAndSelect("test.discipline", "discipline")
          .leftJoinAndSelect("test.classrooms", "classroom")
          .leftJoinAndSelect("classroom.school", "school")
          .where( new Brackets((qb) => {
            if (!masterUser) {
              qb.where("classroom.id IN (:...teacherClasses)", { teacherClasses: teacherClasses.classrooms })
            }
            if(bimesterId) { qb.andWhere("bimester.id = :bimesterId", { bimesterId }) }
            if(disciplineId) { qb.andWhere("discipline.id = :disciplineId", { disciplineId }) }
          }))
          .andWhere("year.name = :yearName", { yearName: req.params.year as string })
          .andWhere("test.name LIKE :search", { search: `%${ req.query.search as string }%` })
          .take(limit)
          .skip(offset)
          .addOrderBy('test.name')
          .addOrderBy('bimester.name')
          .getMany();

        data = data.map(el => {
          if([TEST_CATEGORIES_IDS.LITE_1, TEST_CATEGORIES_IDS.LITE_2, TEST_CATEGORIES_IDS.LITE_3].includes(el.category.id)) { return { ...el, period: { ...el.period, bimester: { ...el.period.bimester, name: el.period.bimester.testName } } } }
          return { ...el }
        })

        return { status: 200, data };
      })
    }
    catch (error: any) { return { status: 500, message: error.message } }
    finally { if(sqlConnection) { sqlConnection.release() } }
  }

  async aggregatedTestResult(req: Request) {
    const sqlConnection = await dbConn();

    try {
      const localTests = (await this.getAggregate(req)).data;
      const response: any = {
        headers: [],
        schools: []
      };

      if (!localTests?.length) {
        return { status: 200, data: response };
      }

      const schoolMap = new Map<number, any>();

      for (const el of localTests) {
        const { data: test } = await AppDataSource.transaction(async (CONN) =>
          this.wrapper(CONN, sqlConnection, el.id.toString(), req.params.year)
        );

        response.headers.push(el.disciplineName);
        response.testName ??= el.category;
        response.classroom ??= `${req.params.classroom}° anos`;
        response.bimester ??= el.bimester;
        response.year ??= req.params.year;

        for (const school of test!.schools) {
          if (!schoolMap.has(school.id)) {
            const schoolData = {
              id: school.id,
              name: school.name,
              shortName: school.shortName,
              schoolAvg: [(school as any).schoolAvg]
            };
            schoolMap.set(school.id, schoolData);
            response.schools.push(schoolData);
          } else {
            schoolMap.get(school.id).schoolAvg.push((school as any).schoolAvg);
          }
        }
      }
      return { status: 200, data: response };
    }
    catch (error: any) {
      console.log('aggregatedTestResult', error)
      return { status: 500, message: error.message }
    }
    finally { sqlConnection?.release() }
  }

  async getAggregate(req: Request) {

    let sqlConnection = await dbConn()

    const classroom = req.query.classroom ?? req.params.classroom
    const bimester = req.query.bimester ?? req.params.bimester
    const year = req.params.year as string

    try {

      if(!classroom || !bimester) { return { status: 400, message: "Parâmetros inválidos. É necessário informar o ID da turma e do bimestre." } }

      let data = await this.qAggregateTest(sqlConnection, year, Number(classroom as string), Number(bimester as string))

      return { status: 200, data };

    }
    catch (error: any) {
      console.log('getAggregate', error)
      return { status: 500, message: error.message }
    }
    finally { if(sqlConnection) { sqlConnection.release() } }
  }

  async wrapper(CONN: EntityManager, sqlConnection: PoolConnection, testId: string, yearName: string) {

    let data;

    const qTest = await this.qTestByIdAndYear(sqlConnection, Number(testId), yearName)
    if (!qTest) return { status: 404, message: "Teste não encontrado" };

    switch (qTest?.test_category_id) {
      case(TEST_CATEGORIES_IDS.LITE_1):
      case(TEST_CATEGORIES_IDS.LITE_2):
      case(TEST_CATEGORIES_IDS.LITE_3): {

        if(!qTest?.year_id) return { status: 404, message: "Ano não encontrado." }

        let headers = await this.qAlphabeticHeaders(sqlConnection, yearName) as unknown as AlphaHeaders[]

        const tests = await this.qAlphabeticTests(sqlConnection, qTest.test_category_id, qTest.discipline_id, qTest.year_name) as unknown as Test[]

        let schools;
        let testQuestionsIds: number[] = []

        if(qTest.test_category_id != TEST_CATEGORIES_IDS.LITE_1) {

          for(let test of tests) {

            const testQuestions = await this.qTestQuestions(sqlConnection, test.id) as TestQuestion[]

            test.testQuestions = testQuestions
            testQuestionsIds = [ ...testQuestionsIds, ...testQuestions.map(testQuestion => testQuestion.id) ]
          }
        }

        headers = headers.map(bi => { return { ...bi, testQuestions: tests.find(test => test.period.bimester.id === bi.id)?.testQuestions } })

        let preResult = await testController.alphaQuestions(qTest.year_name, qTest, testQuestionsIds, CONN)

        let mappedSchools = preResult.map(school => {
          const element = { id: school.id, name: school.name, shortName: school.shortName, school: school.name, totals: headers.map(h => ({ ...h, bimesterCounter: 0 }))}
          return { ...element, totals: testController.aggregateResult(element, testController.alphabeticTotalizators(school.classrooms, headers)) }
        })

        const cityHallName = 'PREFEITURA DO MUNICÍPIO DE ITATIBA'
        const cityHall = { id: 999, name: cityHallName, shortName: 'ITATIBA', school: cityHallName, totals: headers.map(h => ({ ...h, bimesterCounter: 0 })) }

        cityHall.totals = testController.aggregateResult(cityHall, testController.alphabeticTotalizators(preResult.flatMap(school => school.classrooms), headers))

        schools = [ ...mappedSchools, cityHall ]

        const test = { id: 99, name: qTest.name, category: { id: qTest.test_category_id, name: qTest.test_category_name }, discipline: { name: qTest.discipline_name }, period: { bimester: { name: 'TODOS' }, year: { id: qTest.year_id, name: qTest.year_name, active: qTest.year_active } } }

        data = { alphabeticHeaders: headers, ...test, schools }

        break;
      }

      case(TEST_CATEGORIES_IDS.READ_2):
      case(TEST_CATEGORIES_IDS.READ_3): {

        let formatedTest = this.formatedTest(qTest)

        const qYear = await this.qYearByName(sqlConnection, yearName)

        if(!qYear) return { status: 404, message: "Ano não encontrado." }

        const headers = await this.qReadingFluencyHeaders(sqlConnection)

        const fluencyHeaders = testController.readingFluencyHeaders(headers)

        let localSchools = await this.qSchools(sqlConnection, Number(testId))

        for(let school of localSchools) {

          school.classrooms = await this.qClassroomsByTestId(sqlConnection, school.id, Number(testId))

          for(let classroom of school.classrooms) {

            classroom.studentsClassrooms = testController
              .duplicatedStudents(await this.qStudentClassrooms(sqlConnection, classroom.id, qYear.id))
              .filter((el:any) => !el.ignore)

            for(let studentClassroom of classroom.studentsClassrooms) {

              studentClassroom.student.readingFluency = await this.qReadingFluency(sqlConnection, Number(testId), studentClassroom.student.id)

            }
          }
        }

        const totalCityHallColumn: any[] = []
        const examTotalCityHall = headers.reduce((acc, prev) => { const key = prev.readingFluencyExamId; if(!acc[key]) { acc[key] = 0 } return acc }, {} as any)

        const localSchoolsAllSchools = localSchools.reduce((acc: { id: number, name: string, shortName: string, percentTotalByColumn: number[], totalByColumn: number[] }[], school) => {

          let totalNuColumn: any[] = []
          const percentColumn = headers.reduce((acc, prev) => { const key = prev.readingFluencyExamId; if(!acc[key]) { acc[key] = 0 } return acc }, {} as any)

          for(let hD of headers) {

            const studentClassrooms = school.classrooms.flatMap(el =>
              el.studentsClassrooms.flatMap(item =>
                item.student.readingFluency?.filter(rD =>
                  item.classroomId === rD.rClassroomId &&
                  rD.readingFluencyExamId === hD.readingFluencyExamId &&
                  rD.readingFluencyLevelId === hD.readingFluencyLevelId
                )
              )
            )

            const value = studentClassrooms.length ?? 0
            totalNuColumn.push({ total: value, divideByExamId: hD.readingFluencyExamId })

            const cityHallColumn = totalCityHallColumn.find(el => el.readingFluencyExamId === hD.readingFluencyExamId && el.readingFluencyLevelId === hD.readingFluencyLevelId)
            if(!cityHallColumn) { totalCityHallColumn.push({ total: value, readingFluencyExamId: hD.readingFluencyExamId, readingFluencyLevelId: hD.readingFluencyLevelId })}
            else { cityHallColumn.total += value }

            percentColumn[hD.readingFluencyExamId] += value
            examTotalCityHall[hD.readingFluencyExamId] += value
          }

          const totalByColumn = totalNuColumn.map((el: any) => el.total)
          const percentTotalByColumn = totalNuColumn.map((el: any) => Math.floor((el.total / percentColumn[el.divideByExamId]) * 10000) / 100)

          acc.push({ id: school.id, name: school.name, shortName: school.shortName, percentTotalByColumn, totalByColumn })

          return acc
        }, [])

        const cityHall = {
          id: 999,
          name: 'PREFEITURA DO MUNICÍPIO DE ITATIBA',
          shortName: 'ITATIBA',
          totalByColumn: totalCityHallColumn.map(item => item.total),
          percentTotalByColumn: totalCityHallColumn.map(item => item.total = Math.floor((item.total / examTotalCityHall[item.readingFluencyExamId]) * 10000) / 100)
        }

        data = { ...formatedTest, fluencyHeaders, schools: [...localSchoolsAllSchools, cityHall] }

        break;
      }

      case(TEST_CATEGORIES_IDS.AVL_ITA):
      case(TEST_CATEGORIES_IDS.SIM_ITA): {

        let formatedTest = this.formatedTest(qTest)

        const year = await CONN.findOne(Year, { where: { name: yearName } })
        if (!year) return { status: 404, message: "Ano não encontrado." }

        const qTestQuestions = await this.qTestQuestions(sqlConnection, testId) as TestQuestion[]

        if (!qTestQuestions) return { status: 404, message: "Questões não encontradas" }
        const testQuestionsIds = qTestQuestions.map(testQuestion => testQuestion.id)

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



            return { id: s.id, name: s.name, shortName: s.shortName, schoolId: s.id, schoolAvg: 0,
              totals: qTestQuestions.map(tQ => {

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

        const cityHall = { id: 999, name: 'PREFEITURA DO MUNICÍPIO DE ITATIBA', shortName: 'ITATIBA', totals: allResults, schoolAvg: 0 }

        const firstElement = cityHall.totals[0]?.tPercent ?? 0

        answersLetters = answersLetters.map(el => ({
          ...el,
          questions: el.questions.map(question => ({
            ...question,
            percentage: firstElement > 0 ? Math.floor((question.occurrences / firstElement) * 10000) / 100 : 0
          }))
        }))

        const mappedSchools = [...schools, cityHall].map((school) => {

          const tNumberTotal = school.totals.reduce((acc, item) => acc + item.tNumber, 0);
          const tPercentTotal = school.totals.reduce((acc, item) => acc + item.tPercent, 0);

          return { ...school, tNumberTotal, tPercentTotal, schoolAvg: tPercentTotal > 0 ? Math.floor((tNumberTotal / tPercentTotal) * 10000) / 100 : 0 }
        })

        data = { ...formatedTest, totalOfStudents: firstElement, schools: mappedSchools, testQuestions: qTestQuestions, questionGroups, answersLetters };

        break;
      }
    }
    return { status: 200, data }
  }

  // TODO: MAKE MYSQL2
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
      .andWhere("school.id NOT IN (:...schoolsIds)", { schoolsIds: [28, 29] })
      .andWhere("classroom.id NOT IN (:...classroomsIds)", { classroomsIds: [1216,1217,1218] })
      .andWhere("studentClassroomYear.id = :yearId", { yearId: year.id })
      .andWhere("periodYear.id = :yearId", { yearId: year.id })
      .orderBy("questionGroup.id", "ASC")
      .addOrderBy("testQuestion.order", "ASC")
      .addOrderBy("school.shortName", "ASC")
      .getMany()
  }
}

export const reportController = new ReportController();

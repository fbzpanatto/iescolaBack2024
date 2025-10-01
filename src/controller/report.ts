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
          return await this.wrapper(sqlConnection, request?.params.id, request?.params.year)
        })
      }
      return await this.wrapper(sqlConnection, request?.params.id, request?.params.year)
    } catch (error: any) {
      console.log('error', error)
      return { status: 500, message: error.message }
    } finally { if (sqlConnection) { sqlConnection.release() } }
  }

  async qTestQuestionsGroups(testId: number, conn: PoolConnection) {
    const query =
      `
        SELECT 
          qg.id,
          qg.name,
          COUNT(tq.id) AS questionsCount
        FROM question_group qg
        INNER JOIN test_question tq ON tq.questionGroupId = qg.id
        WHERE tq.testId = ?
        GROUP BY qg.id, qg.name
        ORDER BY qg.id
      `

    const [result] = await conn.query(query, [testId])

    return result as Array<{ id: number, name: string, questionsCount: number }>
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

  async listAggregatedTests(req: Request) {

    let sqlConnection = await dbConn()

    const classroom = req.query.classroom ?? req.params.classroom
    const bimester = req.query.bimester ?? req.params.bimester
    const category = req.query.category ?? req.params.category

    const year = req.params.year as string

    try {

      if(!classroom || !bimester) { return { status: 400, message: "Parâmetros inválidos. É necessário informar o ID da turma e do bimestre." } }

      let data = await this.qAggregateTest(sqlConnection, year, Number(classroom as string), Number(bimester as string), Number(category as string))

      return { status: 200, data };

    }
    catch (error: any) {
      console.log('getAggregate', error)
      return { status: 500, message: error.message }
    }
    finally { if(sqlConnection) { sqlConnection.release() } }
  }

  async aggregatedTestResultFullParallel(req: Request) {
    const sqlConnection = await dbConn();

    try {
      const localTests = (await this.listAggregatedTests(req)).data;
      const response: any = { headers: [], schools: [] };

      if (!localTests?.length) { return { status: 200, data: response } }

      const allPromises = localTests.map(async (el) => {
        const result = await this.wrapper(sqlConnection, el.id.toString(), req.params.year)
        return { testName: el.testName, bimester: el.bimester, data: result.data };
      });

      const allResults = await Promise.all(allPromises);

      const schoolMap = new Map<number, any>();

      for (const { testName, bimester, data: test } of allResults) {

        if(test?.category.id === TEST_CATEGORIES_IDS.AVL_ITA){
          response.headers.push(test.discipline.name);
        } else {
          response.headers.push(testName);
        }

        response.testName = response.testName || testName;
        response.classroom = response.classroom || `${req.params.classroom}° anos`;
        response.bimester = response.bimester || bimester;
        response.year = response.year || req.params.year;
        response.testCategory = test?.category.id;
        response.categoryName = test?.category.name;

        if (!test?.schools) continue;

        for (const school of test.schools) {
          if (!schoolMap.has(school.id)) {
            const schoolData = { id: school.id, name: school.name, shortName: school.shortName, schoolAvg: [(school as any).schoolAvg] };
            schoolMap.set(school.id, schoolData);
            response.schools.push(schoolData);
          }
          else { schoolMap.get(school.id).schoolAvg.push((school as any).schoolAvg) }
        }
      }
      return { status: 200, data: response };
    }
    catch (error: any) {
      console.log('aggregatedTestResultFullParallel', error);
      return { status: 500, message: error.message };
    }
    finally { sqlConnection?.release() }
  }

  async wrapper(sqlConnection: PoolConnection, testId: string, yearName: string) {

    let data;

    const qTest = await this.qTestByIdAndYear(sqlConnection, Number(testId), yearName)
    if (!qTest) return { status: 404, message: "Teste não encontrado" };

    switch (qTest?.test_category_id) {
      case(TEST_CATEGORIES_IDS.LITE_1):
      case(TEST_CATEGORIES_IDS.LITE_2):
      case(TEST_CATEGORIES_IDS.LITE_3): {

        if(!qTest?.year_id) return { status: 404, message: "Ano não encontrado." }

        let headers = await this.qAlphabeticHeaders(sqlConnection, yearName) as any[]

        const tests = await this.qAlphabeticTests(sqlConnection, qTest.test_category_id, qTest.discipline_id, qTest.year_name) as any[]

        let testQuestionsIds: number[] = []

        if(qTest.test_category_id != TEST_CATEGORIES_IDS.LITE_1 && tests.length > 0) {

          const allTqs = await Promise.all(tests.map(test => this.qTestQuestions(sqlConnection, test.id)))

          let index = 0
          for(const test of tests) {
            test.testQuestions = allTqs[index]
            testQuestionsIds.push(...test.testQuestions.map((tq: any) => tq.id))
            index++
          }
        }

        const testsByBimesterId = new Map()
        for(const test of tests) {
          const bimesterId = test.period?.bimester?.id
          if(bimesterId) { testsByBimesterId.set(bimesterId, test) }
        }

        headers = headers.map((bi: any) => { return { ...bi, testQuestions: testsByBimesterId.get(bi.id)?.testQuestions || [] } })

        let preResult = await testController.alphaQuestions(qTest.year_name, qTest, testQuestionsIds, sqlConnection)

        let mappedSchools = preResult.map((school: any) => {
          const element = {
            id: school.id,
            name: school.name,
            shortName: school.shortName,
            school: school.name,
            totals: headers.map((h: any) => ({ ...h, bimesterCounter: 0 }))
          }

          element.totals = testController.aggregateResult(element, testController.alphabeticTotalizators(school.classrooms, headers))
          return element
        })

        const cityHallName = 'PREFEITURA DO MUNICÍPIO DE ITATIBA'
        const cityHall = {
          id: 999,
          name: cityHallName,
          shortName: 'ITATIBA',
          school: cityHallName,
          totals: headers.map((h: any) => ({ ...h, bimesterCounter: 0 }))
        }

        cityHall.totals = testController.aggregateResult(
          cityHall,
          testController.alphabeticTotalizators(preResult.flatMap((school: any) => school.classrooms), headers)
        )

        const schools = [...mappedSchools, cityHall]

        const test = {
          id: 99,
          name: qTest.name,
          category: { id: qTest.test_category_id, name: qTest.test_category_name },
          discipline: { name: qTest.discipline_name },
          period: {
            bimester: { name: 'TODOS' },
            year: { id: qTest.year_id, name: qTest.year_name, active: qTest.year_active }
          }
        }

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

        const year = await this.qYearByName(sqlConnection, yearName)
        // const year = await CONN.findOne(Year, { where: { name: yearName } })
        if (!year) return { status: 404, message: "Ano não encontrado." }

        const qTestQuestions = await this.qTestQuestions(sqlConnection, testId) as TestQuestion[]
        if (!qTestQuestions) return { status: 404, message: "Questões não encontradas" }

        const testQuestionsIds = qTestQuestions.map(testQuestion => testQuestion.id)
        const questionGroups = await this.qTestQuestionsGroups(Number(testId), sqlConnection)
        const preResult = await this.getTestForGraphic(testId, testQuestionsIds, year, sqlConnection)

        // Maps para lookup O(1)
        const answersLettersMap = new Map<string, Map<string, any>>()
        const testQuestionsMap = new Map(qTestQuestions.map(tq => [tq.id, tq]))

        const schools = preResult
          .filter(s => s.classrooms.some((c: any) =>
            c.studentClassrooms.some((sc: any) =>
              sc.student.studentQuestions.some((sq: any) => sq.answer?.length > 0)
            )
          ))
          .map(s => {
            // Identificar duplicados primeiro
            const studentCountMap = new Map<number, number>()
            const validStudentClassrooms: any[] = []

            for (const c of s.classrooms) {
              for (const sc of c.studentClassrooms) {
                const hasValidAnswers = sc.student.studentQuestions.some((sq: any) =>
                  sq.answer?.length > 0 && sq.rClassroom?.id === c.id
                )

                if (hasValidAnswers) {
                  const count = studentCountMap.get(sc.student.id) || 0
                  studentCountMap.set(sc.student.id, count + 1)
                  validStudentClassrooms.push(sc)
                }
              }
            }

            // Filtrar duplicados
            const filtered = validStudentClassrooms.filter(sc => {
              const studentCount = studentCountMap.get(sc.student.id)
              if (!studentCount) return true // Se não está no map, não é duplicado

              const isDuplicate = studentCount > 1 && sc.endedAt
              return !isDuplicate
            })

            // Processar totais com cache
            const totals = qTestQuestions.map(tQ => {
              if (!tQ.active) {
                return { id: tQ.id, order: tQ.order, tNumber: 0, tPercent: 0, tRate: 0 }
              }

              let matchedCount = 0

              for (const sc of filtered) {
                for (const sq of sc.student.studentQuestions) {
                  if (sq.testQuestion?.id === tQ.id &&
                    sq.answer?.length > 0 &&
                    sq.rClassroom?.id === sc.classroom.id) {

                    // Processar letra para answersLetters
                    const letter = sq.answer.trim().toUpperCase() || 'VAZIO'

                    if (!answersLettersMap.has(letter)) {
                      answersLettersMap.set(letter, new Map())
                    }

                    const letterMap = answersLettersMap.get(letter)!
                    const key = `${tQ.id}-${tQ.order}`

                    if (!letterMap.has(key)) {
                      letterMap.set(key, {
                        id: tQ.id,
                        order: tQ.order,
                        occurrences: 0,
                        percentage: 0
                      })
                    }

                    const occurrence = letterMap.get(key)!
                    occurrence.occurrences++

                    // Verificar se é resposta correta
                    if (tQ.answer?.includes(letter)) {
                      matchedCount++
                    }
                  }
                }
              }

              const total = filtered.length
              const tRate = total > 0 ? Math.floor((matchedCount / total) * 10000) / 100 : 0

              return {
                id: tQ.id,
                order: tQ.order,
                tNumber: matchedCount,
                tPercent: total,
                tRate
              }
            })

            return {
              id: s.id,
              name: s.name,
              shortName: s.shortName,
              schoolId: s.id,
              schoolAvg: 0,
              totals
            }
          })

        // Agregar resultados totais usando Map
        const allResultsMap = new Map<number, any>()

        for (const school of schools) {
          for (const item of school.totals) {
            const existing = allResultsMap.get(item.id)
            if (!existing) {
              allResultsMap.set(item.id, { ...item })
            } else {
              existing.tNumber += item.tNumber
              existing.tPercent += item.tPercent
              existing.tRate = existing.tPercent > 0
                ? Math.floor((existing.tNumber / existing.tPercent) * 10000) / 100
                : 0
            }
          }
        }

        const allResults = Array.from(allResultsMap.values())
        const cityHall = {
          id: 999,
          name: 'PREFEITURA DO MUNICÍPIO DE ITATIBA',
          shortName: 'ITATIBA',
          totals: allResults,
          schoolAvg: 0
        }

        const firstElement = cityHall.totals[0]?.tPercent ?? 0

        // Converter answersLettersMap para array
        const answersLetters = Array.from(answersLettersMap.entries()).map(([letter, questions]) => ({
          letter,
          questions: Array.from(questions.values()).map(q => ({
            ...q,
            percentage: firstElement > 0
              ? Math.floor((q.occurrences / firstElement) * 10000) / 100
              : 0
          }))
        }))

        // Mapear escolas com totais
        const mappedSchools = [...schools, cityHall].map(school => {
          const tNumberTotal = school.totals.reduce((acc, item) => acc + item.tNumber, 0)
          const tPercentTotal = school.totals.reduce((acc, item) => acc + item.tPercent, 0)

          return {
            ...school,
            tNumberTotal,
            tPercentTotal,
            schoolAvg: tPercentTotal > 0
              ? Math.floor((tNumberTotal / tPercentTotal) * 10000) / 100
              : 0
          }
        })

        data = {
          ...formatedTest,
          totalOfStudents: firstElement,
          schools: mappedSchools,
          testQuestions: qTestQuestions,
          questionGroups,
          answersLetters
        }

        break
      }
    }
    return { status: 200, data }
  }

  async getTestForGraphic(testId: string, testQuestionsIds: number[], year: any, conn: PoolConnection) {

    const testQuestionsPlaceholders = testQuestionsIds.map(() => '?').join(',');

    const query = `
    SELECT 
      s.id AS school_id,
      s.name AS school_name,
      s.shortName AS school_shortName,
      c.id AS classroom_id,
      c.name AS classroom_name,
      c.shortName AS classroom_shortName,
      sc.id AS studentClassroom_id,
      sc.studentId AS student_id,
      sc.rosterNumber,
      sc.startedAt,
      sc.endedAt,
      st.id AS student_id_check,
      sq.id AS studentQuestion_id,
      sq.answer AS studentQuestion_answer,
      sq.rClassroomId AS studentQuestion_rClassroomId,
      tq.id AS testQuestion_id,
      tq.order AS testQuestion_order,
      tq.answer AS testQuestion_answer,
      tq.active AS testQuestion_active,
      qg.id AS questionGroup_id,
      qg.name AS questionGroup_name,
      t.id AS test_id,
      t.name AS test_name
    FROM school s
    LEFT JOIN classroom c ON c.schoolId = s.id
    LEFT JOIN student_classroom sc ON sc.classroomId = c.id
    LEFT JOIN student st ON sc.studentId = st.id
    LEFT JOIN student_question sq ON sq.studentId = st.id
    LEFT JOIN test_question tq ON sq.testQuestionId = tq.id 
      AND tq.id IN (${testQuestionsPlaceholders})
    LEFT JOIN question_group qg ON tq.questionGroupId = qg.id
    LEFT JOIN test t ON tq.testId = t.id
    LEFT JOIN period p ON t.periodId = p.id
    WHERE 
      t.id = ?
      AND s.id NOT IN (28, 29)
      AND c.id NOT IN (1216, 1217, 1218)
      AND sc.yearId = ?
      AND p.yearId = ?
    ORDER BY 
      s.shortName ASC,
      c.id ASC,
      qg.id ASC,
      tq.order ASC
  `;

    const params = [...testQuestionsIds, testId, year.id, year.id];
    const [rows] = await conn.query(query, params);

    // Processar e estruturar os dados
    return this.formatTestGraphicData(rows as any[]);
  }

  private formatTestGraphicData(rows: any[]): any[] {
    const schoolsMap = new Map();

    for (const row of rows) {
      // Estrutura escola
      if (!schoolsMap.has(row.school_id)) {
        schoolsMap.set(row.school_id, {
          id: row.school_id,
          name: row.school_name,
          shortName: row.school_shortName,
          classrooms: new Map()
        });
      }

      const school = schoolsMap.get(row.school_id);

      // Estrutura classroom
      if (!school.classrooms.has(row.classroom_id)) {
        school.classrooms.set(row.classroom_id, {
          id: row.classroom_id,
          name: row.classroom_name,
          shortName: row.classroom_shortName,
          studentClassrooms: new Map()
        });
      }

      const classroom = school.classrooms.get(row.classroom_id);

      // Estrutura studentClassroom
      if (!classroom.studentClassrooms.has(row.studentClassroom_id)) {
        classroom.studentClassrooms.set(row.studentClassroom_id, {
          id: row.studentClassroom_id,
          rosterNumber: row.rosterNumber,
          startedAt: row.startedAt,
          endedAt: row.endedAt,
          classroom: {
            id: row.classroom_id,
            shortName: row.classroom_shortName
          },
          student: {
            id: row.student_id,
            studentQuestions: []
          }
        });
      }

      const studentClassroom = classroom.studentClassrooms.get(row.studentClassroom_id);

      // Adicionar studentQuestion se existir
      if (row.studentQuestion_id) {
        const questionExists = studentClassroom.student.studentQuestions.some(
          (sq: any) => sq.id === row.studentQuestion_id
        );

        if (!questionExists) {
          studentClassroom.student.studentQuestions.push({
            id: row.studentQuestion_id,
            answer: row.studentQuestion_answer || '',
            rClassroom: {
              id: row.studentQuestion_rClassroomId
            },
            testQuestion: {
              id: row.testQuestion_id,
              order: row.testQuestion_order,
              answer: row.testQuestion_answer,
              active: row.testQuestion_active,
              test: {
                id: row.test_id,
                period: {
                  bimester: {
                    id: row.questionGroup_id  // Assumindo relação
                  }
                }
              }
            }
          });
        }
      }
    }

    // Converter Maps para Arrays
    const result: any[] = [];
    for (const [, school] of schoolsMap) {
      const classroomsArray: any[] = [];
      for (const [, classroom] of school.classrooms) {
        const studentClassroomsArray: any[] = [];
        for (const [, sc] of classroom.studentClassrooms) {
          studentClassroomsArray.push(sc);
        }
        classroomsArray.push({
          ...classroom,
          studentClassrooms: studentClassroomsArray
        });
      }
      result.push({
        ...school,
        classrooms: classroomsArray
      });
    }

    return result;
  }
}

export const reportController = new ReportController();

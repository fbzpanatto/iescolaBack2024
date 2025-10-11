import { GenericController } from "./genericController";
import { Brackets, EntityTarget } from "typeorm";
import { Test } from "../model/Test";
import { AppDataSource } from "../data-source";
import { TestQuestion } from "../model/TestQuestion";
import { Request } from "express";
import { pc } from "../utils/personCategories";
import { TEST_CATEGORIES_IDS } from "../utils/testCategory";
import { testController } from "./test";

class ReportController extends GenericController<EntityTarget<Test>> {
  constructor() { super(Test) }

  async getSchoolAvg(request: Request) {
    try {
      const data = (await this.getReport(request) as any).data;
      if (!data) return { status: 404, message: "Teste não encontrado" };
      return { status: 200, data };
    } catch (error: any) { return { status: 500, message: error.message } }
  }

  async getReport(request: Request) {
    try { return await this.wrapper(request?.params.id, request?.params.year) }
    catch (error: any) { console.log('error', error); return { status: 500, message: error.message } }
  }

  async reportFindAll(req: Request) {

    const limit =  !isNaN(parseInt(req.query.limit as string)) ? parseInt(req.query.limit as string) : 100
    const offset =  !isNaN(parseInt(req.query.offset as string)) ? parseInt(req.query.offset as string) : 0
    const bimesterId = !isNaN(parseInt(req.query.bimester as string)) ? parseInt(req.query.bimester as string) : null
    const disciplineId = !isNaN(parseInt(req.query.discipline as string)) ? parseInt(req.query.discipline as string) : null

    try {
      return await AppDataSource.transaction(async(CONN) => {

        const teacher = await this.qTeacherByUser(req.body.user.user)
        const teacherClasses = await this.qTeacherClassrooms(req?.body.user.user)
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
          if([TEST_CATEGORIES_IDS.LITE_1, TEST_CATEGORIES_IDS.LITE_2, TEST_CATEGORIES_IDS.LITE_3].includes(el.category.id)) {
            return { ...el, period: { ...el.period, bimester: { ...el.period.bimester, name: el.period.bimester.testName } } }
          }
          return { ...el }
        })

        return { status: 200, data };
      })
    }
    catch (error: any) { return { status: 500, message: error.message } }
  }
  async listAggregatedTests(req: Request) {
    const classroom = req.query.classroom ?? req.params.classroom
    const bimester = req.query.bimester ?? req.params.bimester
    const category = req.query.category ?? req.params.category
    const year = req.params.year as string
    try {
      if(!classroom || !bimester) { return { status: 400, message: "Parâmetros inválidos. É necessário informar o ID da turma e do bimestre." } }
      let data = await this.qAggregateTest(year, Number(classroom as string), Number(bimester as string), Number(category as string))
      return { status: 200, data };
    }
    catch (error: any) { console.log('getAggregate', error); return { status: 500, message: error.message } }
  }

  async aggregatedTestResultFullParallel(req: Request) {
    try {
      const localTests = (await this.listAggregatedTests(req)).data;
      const response: any = { headers: [], schools: [] };

      if (!localTests?.length) { return { status: 200, data: response } }

      const allPromises = localTests.map(async (el) => {
        const result = await this.wrapper(el.id.toString(), req.params.year)
        return { testName: el.testName, bimester: el.bimester, data: result.data };
      });

      const allResults = await Promise.all(allPromises);

      const schoolMap = new Map<number, any>();

      for (const { testName, bimester, data: test } of allResults) {

        response.headers.push(testName)

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
    catch (error: any) { console.log('aggregatedTestResultFullParallel', error); return { status: 500, message: error.message } }
  }

  async wrapper(testId: string, yearName: string) {

    let data;

    const qTest = await this.qTestByIdAndYear(Number(testId), yearName)
    if (!qTest) return { status: 404, message: "Teste não encontrado" };

    switch (qTest?.test_category_id) {
      case(TEST_CATEGORIES_IDS.LITE_1):
      case(TEST_CATEGORIES_IDS.LITE_2):
      case(TEST_CATEGORIES_IDS.LITE_3): {

        if(!qTest?.year_id) return { status: 404, message: "Ano não encontrado." }

        let headers = await this.qAlphabeticHeaders(yearName) as any[]

        const tests = await this.qAlphabeticTests(qTest.test_category_id, qTest.discipline_id, qTest.year_name) as any[]

        let testQuestionsIds: number[] = []

        if(qTest.test_category_id != TEST_CATEGORIES_IDS.LITE_1 && tests.length > 0) {

          const testIds = tests.map(test => test.id);
          const questionsMap = await this.qTestQuestionsForMultipleTests(testIds);

          for (const test of tests) {
            const questions = questionsMap.get(test.id) || [];
            test.testQuestions = questions;
            testQuestionsIds.push(...questions.map((tq: any) => tq.id));
          }
        }

        const testsByBimesterId = new Map()
        for(const test of tests) {
          const bimesterId = test.period?.bimester?.id
          if(bimesterId) { testsByBimesterId.set(bimesterId, test) }
        }

        headers = headers.map((bi: any) => { return { ...bi, testQuestions: testsByBimesterId.get(bi.id)?.testQuestions || [] } })

        const serieFilter = `${qTest?.test_category_id}%`;

        let preResult = await testController.alphaQuestions(serieFilter, qTest.year_name, qTest, testQuestionsIds)

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

        const qYear = await this.qYearByName(yearName)

        if(!qYear) return { status: 404, message: "Ano não encontrado." }

        const headers = await this.qReadingFluencyHeaders()

        const fluencyHeaders = testController.readingFluencyHeaders(headers)

        let localSchools = await this.qSchools(Number(testId))

        for(let school of localSchools) {

          school.classrooms = await this.qClassroomsByTestId(school.id, Number(testId))

          for(let classroom of school.classrooms) {

            classroom.studentsClassrooms = testController
              .duplicatedStudents(await this.qStudentClassrooms(classroom.id, qYear.id))
              .filter((el:any) => !el.ignore)

            for(let studentClassroom of classroom.studentsClassrooms) {

              studentClassroom.student.readingFluency = await this.qReadingFluency(Number(testId), studentClassroom.student.id)

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

        const year = await this.qYearByName(yearName)
        // const year = await CONN.findOne(Year, { where: { name: yearName } })
        if (!year) return { status: 404, message: "Ano não encontrado." }

        const qTestQuestions = await this.qTestQuestions(testId) as TestQuestion[]
        if (!qTestQuestions) return { status: 404, message: "Questões não encontradas" }

        const testQuestionsIds = qTestQuestions.map(testQuestion => testQuestion.id)
        const questionGroups = await this.qTestQuestionsGroupsOnReport(Number(testId))
        const preResult = await this.getTestForGraphic(testId, testQuestionsIds, year)

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

  async getTestForGraphic(testId: string, testQuestionsIds: number[], year: any) {
    try {
      const rows = await this.qGetTestForGraphic(testId, testQuestionsIds, year)
      return this.formatTestGraphicData(rows as any[]);
    }
    catch (error) { console.error(error); throw error }
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

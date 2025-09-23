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
import { StudentQuestion } from "../model/StudentQuestion";
import { StudentTestStatus } from "../model/StudentTestStatus";
import { pc } from "../utils/personCategories";
import { Year } from "../model/Year";
import { Brackets, EntityManager, EntityTarget, ObjectLiteral } from "typeorm";
import { Question } from "../model/Question";
import { Discipline } from "../model/Discipline";
import { Bimester } from "../model/Bimester";
import { TestCategory } from "../model/TestCategory";
import { ReadingFluency } from "../model/ReadingFluency";
import { TEST_CATEGORIES_IDS } from "../utils/testCategory";
import { AllClassrooms, AlphaHeaders, CityHall, insertStudentsBody, notIncludedInterface, qAlphaStuClassroomsFormated, qReadingFluenciesHeaders, qStudentClassroomFormated, qStudentsClassroomsForTest, ReadingHeaders, TestBodySave, Totals } from "../interfaces/interfaces";
import { Alphabetic } from "../model/Alphabetic";
import { Disability } from "../model/Disability";
import { Person } from "../model/Person";
import { PoolConnection } from "mysql2/promise";
import { Skill } from "../model/Skill";

import { dbConn} from "../services/db";

class TestController extends GenericController<EntityTarget<Test>> {

  constructor() { super(Test) }

  async getStudents(req?: Request) {
    const testId = Number(req?.params.id)
    const classroomId = Number(req?.params.classroom)
    const studentClassroomId = Number(req?.query.stc)
    const isHistory = Boolean(req?.query.isHistory)

    let sqlConn = await dbConn()

    try {

      const testClassroom = await this.qTestClassroom(sqlConn, testId, classroomId)
      if(!testClassroom) { return { status: 404, message: 'Esse teste não existe para a sala em questão.' } }

      const tUser = await this.qUser(sqlConn, req?.body.user.user)
      const masterUser = tUser?.categoryId === pc.ADMN || tUser?.categoryId === pc.SUPE || tUser?.categoryId === pc.FORM;

      const { classrooms } = await this.qTeacherClassrooms(sqlConn, Number(req?.body.user.user))
      if(!classrooms?.includes(classroomId) && !masterUser && !isHistory) { return { status: 403, message: "Você não tem permissão para acessar essa sala." } }

      return await AppDataSource.transaction(async (appCONN) => {

        const qTest = await this.qTestByIdAndYear(sqlConn, testId, String(req?.params.year))

        if(!qTest) return { status: 404, message: "Teste não encontrado" }

        const test = this.formatedTest(qTest)

        const classroom = await this.qClassroom(sqlConn, classroomId)

        if(!classroom) return { status: 404, message: "Sala não encontrada" }

        let data;

        switch (test.category.id) {
          case(TEST_CATEGORIES_IDS.LITE_1):
          case(TEST_CATEGORIES_IDS.LITE_2):
          case(TEST_CATEGORIES_IDS.LITE_3): {

            const sCs = await this.qAlphabeticStudentsForLink(sqlConn, Number(classroomId), test.createdAt, test.period.year.name)

            const headers = await this.qAlphabeticHeaders(sqlConn, test.period.year.name) as unknown as AlphaHeaders[]

            switch (test.category.id) {
              case(TEST_CATEGORIES_IDS.LITE_1): {
                data = await this.alphabeticTest(
                  false, headers, test, sCs, classroom, classroomId, tUser?.userId as number, appCONN, sqlConn, isNaN(studentClassroomId) ? null : Number(studentClassroomId)
                )
                break;
              }
              case(TEST_CATEGORIES_IDS.LITE_2):
              case(TEST_CATEGORIES_IDS.LITE_3): {
                data = await this.alphabeticTest(
                  true, headers, test, sCs, classroom, classroomId, tUser?.userId as number, appCONN, sqlConn, isNaN(studentClassroomId) ? null : Number(studentClassroomId)
                )
                break;
              }
            }
            break;
          }

          case(TEST_CATEGORIES_IDS.READ_2):
          case(TEST_CATEGORIES_IDS.READ_3): {

            const headers = await this.qReadingFluencyHeaders(sqlConn)
            const fluencyHeaders = this.readingFluencyHeaders(headers)

            const preStudents = await this.stuClassReadF(
              test, Number(classroomId), test.period.year.name, appCONN, isNaN(studentClassroomId) ? null : Number(studentClassroomId)
            )

            await this.linkReading(headers, preStudents, test, tUser?.userId as number, appCONN)

            let studentClassrooms = await this.getReadingFluencyStudents(
              test, classroomId, test.period.year.name, appCONN, isNaN(studentClassroomId) ? null : Number(studentClassroomId)
            )

            studentClassrooms = studentClassrooms.map((item: any) => {

              item.student.readingFluency = item.student.readingFluency.map((rF: ReadingFluency) => {
                if(item.endedAt && rF.rClassroom?.id && rF.rClassroom.id != classroomId) { return { ...rF, gray: true } }

                if(!item.endedAt && rF.rClassroom?.id && rF.rClassroom.id != classroomId) { return { ...rF, gray: true } }

                if(rF.rClassroom?.id && rF.rClassroom.id != classroomId) { return { ...rF, gray: true } }
                return rF
              })

              return item
            })

            for(let item of studentClassrooms) {
              for(let el of item.student.studentDisabilities) {
                const options = { where: { studentDisabilities: el } }
                el.disability = await appCONN.findOne(Disability, options) as Disability
              }
            }

            const totalNuColumn = []

            const allFluencies = studentClassrooms
              .filter((el: any) => !el.ignore)
              .flatMap((el: any) => el.student.readingFluency)

            const percentColumn = headers.reduce((acc, prev) => {
              const key = prev.readingFluencyExamId;
              if(!acc[key]) { acc[key] = 0 }
              return acc
            }, {} as any)

            for(let header of headers) {

              const el = allFluencies.filter((el: any) => {
                const sameClassroom = el.rClassroom?.id === classroomId
                const sameReadFluencyId = el.readingFluencyExam.id === header.readingFluencyExamId
                const sameReadFluencyLevel = el.readingFluencyLevel?.id === header.readingFluencyLevelId
                return sameClassroom && sameReadFluencyId && sameReadFluencyLevel
              })

              const value = el.length ?? 0
              totalNuColumn.push({ total: value, divideByExamId: header.readingFluencyExamId })
              percentColumn[header.readingFluencyExamId] += value
            }

            const totalPeColumn = totalNuColumn.map(el => Math.floor((el.total / percentColumn[el.divideByExamId]) * 10000) / 100)
            data = { test, classroom, studentClassrooms, fluencyHeaders, totalNuColumn: totalNuColumn.map(el => el.total), totalPeColumn }
            break;
          }

          case (TEST_CATEGORIES_IDS.AVL_ITA):
          case (TEST_CATEGORIES_IDS.SIM_ITA): {

            let testQuestionsIds: number[] = []

            const qTestQuestions = await this.qTestQuestions(sqlConn, test.id) as TestQuestion[]

            testQuestionsIds = [ ...testQuestionsIds, ...qTestQuestions.map(testQuestion => testQuestion.id) ]
            const questionGroups = await this.qTestQuestionsGroups(testId, sqlConn)

            let classroomPoints = 0
            let classroomPercent = 0
            let validStudentsTotalizator = 0
            let totals: Totals[] = qTestQuestions.map(el => ({ id: el.id, tNumber: 0, tTotal: 0, tRate: 0 }))
            let answersLetters: { letter: string, questions: {  id: number, order: number, occurrences: number, percentage: number }[] }[] = []

            const qStudentsClassroom = await this.qStudentClassroomsForTest(
              sqlConn, test, classroomId, test.period.year.name, isNaN(studentClassroomId) ? null : Number(studentClassroomId)
            )

            await this.qTestQuestLink(true, qStudentsClassroom, test, qTestQuestions, tUser?.userId as number, appCONN)

            let diffOe = 0
            let validSc = 0

            let result = await this.stuQtsDuplicated(
              test,
              qTestQuestions,
              Number(classroomId),
              test.period.year.name,
              appCONN,
              isNaN(studentClassroomId) ? null : Number(studentClassroomId)
            )

            const mappedResult = result.map((sc: StudentClassroom) => {

              const studentTotals = { rowTotal: 0, rowPercent: 0 }

              if(sc.student.studentQuestions.every(sq => sq.answer?.length < 1)) { return { ...sc, student: { ...sc.student, studentTotals: { rowTotal: '-', rowPercent: '-' } } } }

              if((sc as any).ignore || sc.student.studentQuestions.every(sq => sq.rClassroom?.id != classroom.id) && !sc.endedAt) {

                sc.student.studentQuestions = sc.student.studentQuestions.map(sq => ({...sq, answer: 'OE'}))

                diffOe += 1; return { ...sc, student: { ...sc.student, studentTotals: { rowTotal: 'OE', rowPercent: 'OE' } } }
              }

              if(sc.student.studentQuestions.every(sq => sq.rClassroom?.id != classroom.id)) {

                sc.student.studentQuestions = sc.student.studentQuestions.map(sq => ({...sq, answer: 'TR'}))

                diffOe += 1; return { ...sc, student: { ...sc.student, studentTotals: { rowTotal: 'TR', rowPercent: 'TR' } } }
              }

              validSc += 1
              validStudentsTotalizator += 1

              let counterPercentage = 0

              studentTotals.rowTotal = qTestQuestions.reduce((acc, testQuestion) => {

                if(!testQuestion.active) { validStudentsTotalizator -= 1; return acc }

                counterPercentage += 1

                const studentQuestion = sc.student.studentQuestions.find((sq: any) => sq.testQuestion.id === testQuestion.id)

                if((studentQuestion?.rClassroom?.id != classroom.id )){ return acc }

                let element = totals.find(el => el.id === testQuestion.id)

                if ((studentQuestion?.rClassroom?.id === classroom.id ) && studentQuestion?.answer != '' && studentQuestion?.answer != ' ' && testQuestion.answer?.trim().includes(studentQuestion?.answer.toUpperCase().trim())) {
                  element!.tNumber += 1
                  classroomPoints += 1
                  acc += 1
                }

                element!.tTotal += 1
                classroomPercent += 1
                element!.tRate = Math.floor((element!.tNumber / element!.tTotal) * 10000) / 100;

                const letter = studentQuestion?.answer && studentQuestion.answer.trim().length ? studentQuestion.answer.toUpperCase().trim() : 'VAZIO';

                let ltItem = answersLetters.find(el => el.letter === letter)
                if(!ltItem) { ltItem = { letter, questions: [] }; answersLetters.push(ltItem) }

                let ltQ = ltItem.questions.find(tQ => tQ.id === testQuestion.id)
                if(!ltQ) { ltQ = { id: testQuestion.id, order: testQuestion.order, occurrences: 0, percentage: 0 }; ltItem.questions.push(ltQ) }

                ltQ.occurrences += 1

                answersLetters = answersLetters.map(el => ({...el, questions: el.questions.map(it => ({...it, percentage: Math.floor((it.occurrences / element!.tTotal) * 10000) / 100}))})).sort((a, b) => a.letter.localeCompare(b.letter))

                return acc
              }, 0)

              studentTotals.rowPercent = Math.floor((studentTotals.rowTotal / counterPercentage) * 10000) / 100;

              return { ...sc, student: { ...sc.student, studentTotals } }
            })

            for(let item of mappedResult) {
              for(let el of item.student.studentDisabilities) {
                el.disability = await appCONN.findOne(Disability, { where: {studentDisabilities: el} }) as Disability
              }
            }

            data = {
              test,
              totals,
              answersLetters,
              validSc,
              totalOfSc: mappedResult.length - diffOe,
              totalOfScPercentage: Math.floor((validSc / (mappedResult.length - diffOe)) * 10000) / 100,
              classroom,
              testQuestions: qTestQuestions,
              questionGroups,
              classroomPoints,
              studentClassrooms: mappedResult,
              classroomPercent: Math.floor((classroomPoints / classroomPercent) * 10000) / 100
            }
            break;
          }
        }
        return { status: 200, data };
      })
    }
    catch (error: any) {
      console.log('error', error)
      return { status: 500, message: error.message }
    }
    finally { if (sqlConn) { sqlConn.release() } }
  }

  async getFormData(req: Request) {

    try {
      return await AppDataSource.transaction(async (CONN) => {
        let classrooms = (await classroomController.getAllClassrooms(req, false, CONN)).data

        classrooms = classrooms?.filter(el => ![1216,1217,1218].includes(el.id))

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

    let sqlConnection = await dbConn()

    try {

      return await AppDataSource.transaction(async(CONN) => {

        let data;

        const year = await this.qYearByName(sqlConnection, String(req.query?.year))
        if(!year) return { status: 404, message: "Ano não encontrado." }

        const qUserTeacher = await this.qTeacherByUser(sqlConnection, req.body.user.user)

        const masterUser = qUserTeacher.person.category.id === pc.ADMN || qUserTeacher.person.category.id === pc.SUPE || qUserTeacher.person.category.id === pc.FORM

        const baseTest = this.formatedTest(await this.qTestByIdAndYear(sqlConnection, Number(testId), year.name))

        const { classrooms } = await this.qTeacherClassrooms(sqlConnection, req?.body.user.user)

        if(!classrooms.includes(Number(classroomId)) && !masterUser) {
          return { status: 403, message: "Você não tem permissão para acessar essa sala." }
        }

        const qClassroom = await this.qClassroom(sqlConnection, Number(classroomId))
        if (!qClassroom) return { status: 404, message: "Sala não encontrada" }

        switch (baseTest.category?.id) {
          case TEST_CATEGORIES_IDS.LITE_1:
          case TEST_CATEGORIES_IDS.LITE_2:
          case TEST_CATEGORIES_IDS.LITE_3: {

            let headers = await this.qAlphabeticHeaders(sqlConnection, year.name) as any[]

            const tests = await this.qAlphabeticTests(sqlConnection, baseTest.category.id, baseTest.discipline.id, year.name) as any[]

            let testQuestionsIds: number[] = []

            if(baseTest.category?.id != TEST_CATEGORIES_IDS.LITE_1 && tests.length > 0) {
              // Buscar todas as questões em paralelo
              const allTestQuestionsArrays = await Promise.all(
                tests.map(test => this.qTestQuestions(sqlConnection, test.id))
              )

              // Atribuir aos testes e coletar IDs usando for...of
              let index = 0
              for(const test of tests) {
                test.testQuestions = allTestQuestionsArrays[index]
                testQuestionsIds.push(...test.testQuestions.map((tq: any) => tq.id))
                index++
              }
            }

            // Criar Map para lookup O(1) ao invés de O(n*m)
            const testsByBimesterId = new Map()
            for(const test of tests) {
              const bimesterId = test.period?.bimester?.id
              if(bimesterId) {
                testsByBimesterId.set(bimesterId, test)
              }
            }

            headers = headers.map((bi: any) => {
              return {
                ...bi,
                testQuestions: testsByBimesterId.get(bi.id)?.testQuestions || []
              }
            })

            const schools = await this.alphaQuestions(year.name, baseTest, testQuestionsIds, sqlConnection)
            const onlyClasses = schools
              .flatMap((school: any) => school.classrooms)
              .sort((a: any, b: any) => a.shortName.localeCompare(b.shortName))

            const cityHall = {
              id: 999,
              name: 'ITATIBA',
              shortName: 'ITA',
              school: 'ITATIBA',
              totals: headers.map((h: any) => ({ ...h, bimesterCounter: 0 }))
            }

            let allClassrooms = this.alphabeticTotalizators(onlyClasses, headers)

            cityHall.totals = this.aggregateResult(cityHall, allClassrooms)

            // Validação e declaração direta
            const schoolId = qClassroom?.school?.id
            const resClassrooms = schoolId
              ? [...allClassrooms.filter((c: any) => c.school?.id === schoolId), cityHall]
              : [cityHall]

            const test = {
              id: 99,
              name: baseTest.name,
              classrooms: [qClassroom],
              category: { id: baseTest.category.id, name: baseTest.category.name },
              discipline: { name: baseTest.discipline.name },
              period: { bimester: { name: 'TODOS' }, year }
            }

            data = { alphabeticHeaders: headers, ...test, classrooms: resClassrooms }
            break;
          }

          case TEST_CATEGORIES_IDS.READ_2:
          case TEST_CATEGORIES_IDS.READ_3: {

            const headers = await this.qReadingFluencyHeaders(sqlConnection)
            const fluencyHeaders = this.readingFluencyHeaders(headers)

            const test = await this.getReadingFluencyForGraphic(testId, String(year.id), CONN) as Test

            let response= { ...test, fluencyHeaders }

            response.classrooms = this.cityHallResponse(qClassroom, response.classrooms)

            data = {
              ...response,
              classrooms: response.classrooms.map((classroom: Classroom) => {
                return {
                  id: classroom.id,
                  name: classroom.name,
                  shortName: classroom.shortName,
                  school: classroom.school,
                  percent: this.readingFluencyTotalizator(headers, classroom)
                }
              })
            }

            break;
          }

          case TEST_CATEGORIES_IDS.AVL_ITA:
          case TEST_CATEGORIES_IDS.SIM_ITA: {

            const { test, testQuestions } = await this.getTestForGraphic(testId, String(year.id), CONN, sqlConnection)

            const questionGroups = await this.getTestQuestionsGroups(Number(testId), CONN)
            if(!test) return { status: 404, message: "Teste não encontrado" }

            const classroomResults = test.classrooms
              .filter(classroom => classroom.studentClassrooms.some(sc => sc.student.studentQuestions.some(sq => sq.answer.length > 0)))
              .map(classroom => {

                const studentCount = classroom.studentClassrooms.reduce((acc, item) => { acc[item.student.id] = (acc[item.student.id] || 0) + 1; return acc }, {} as Record<number, number>);

                const duplicatedStudents = classroom.studentClassrooms.filter(item => studentCount[item.student.id] > 1).map(d => d.endedAt ? { ...d, ignore: true } : d)

                const studentClassrooms = classroom.studentClassrooms.map(item => { const duplicated = duplicatedStudents.find(d => d.id === item.id); return duplicated ? duplicated : item })

                const filtered = studentClassrooms.filter((sc: any) => { return !sc.ignore && sc.student.studentQuestions.some((sq: any) => sq.answer.length > 0 && sq.rClassroom.id === classroom.id )})

                const filteredStudentQuestions = filtered.map(sc => sc.student.studentQuestions.filter(sq => sq.answer.length > 0 && sq.rClassroom?.id === classroom.id)).flat()

                return {
                  id: classroom.id,
                  name: classroom.name,
                  shortName: classroom.shortName,
                  school: classroom.school.name,
                  schoolId: classroom.school.id,
                  totals: testQuestions.map(tQ => {

                    if (!tQ.active) { return { id: tQ.id, order: tQ.order, tNumber: 0, tPercent: 0, tRate: 0 } }

                    const studentsQuestions = filteredStudentQuestions.filter(sq => sq.testQuestion.id === tQ.id );

                    const totalSq = studentsQuestions.filter(sq => tQ.answer?.includes(sq.answer.toUpperCase()));

                    const total = filtered.length;
                    const matchedQuestions = totalSq.length;

                    const tRate = matchedQuestions > 0 ? Math.floor((matchedQuestions / total) * 10000) / 100 : 0;

                    return { id: tQ.id, order: tQ.order, tNumber: matchedQuestions, tPercent: total, tRate };
                  })
                }
              })

            const classroomNumber = qClassroom.shortName.replace(/\D/g, "");
            const baseSchoolId = qClassroom.school.id;

            const schoolResults = classroomResults.filter(cl => {
              const clNumber = cl.shortName.replace(/\D/g, "");
              return cl.schoolId === baseSchoolId && clNumber === classroomNumber;
            })

            let allResults: { id: number, order: number, tNumber: number | string, tPercent: number | string, tRate: number | string }[] = []
            const totalClassroomsResults = classroomResults.flatMap(el => el.totals)

            const resultsMap = new Map();

            for (let el of allResults) { resultsMap.set(el.id, el) }

            for (let item of totalClassroomsResults) {
              const el = resultsMap.get(item.id);

              if (!el) {
                const newElement = { id: item.id, order: item.order, tNumber: Number(item.tNumber), tPercent: Number(item.tPercent), tRate: Number(item.tRate)}
                allResults.push(newElement)
                resultsMap.set(item.id, newElement)
              } else {
                el.tNumber += Number(item.tNumber);
                el.tPercent += Number(item.tPercent);
                el.tRate = Math.floor((el.tNumber / el.tPercent) * 10000) / 100;
              }
            }

            const cityHall = { id: 999, name: 'ITATIBA', shortName: 'ITA', school: 'ITATIBA', totals: allResults }

            let allClassrooms = [...schoolResults.sort((a, b) => a.shortName.localeCompare(b.shortName)), cityHall]

            allClassrooms = allClassrooms.map(c => {
              const tNumber = c.totals.reduce((acc, item) => acc += Number(item.tNumber), 0)
              const tPercent = c.totals.reduce((acc, item) => acc += Number(item.tPercent), 0)
              const tRateAvg = Math.floor((tNumber / tPercent) * 10000) / 100
              return { ...c, tRateAvg }
            })

            data = { ...test, testQuestions, questionGroups, classrooms: allClassrooms }
            break;
          }
        }
        return { status: 200, data };
      })
    }
    catch (error: any) { return { status: 500, message: error.message } }
    finally { if(sqlConnection) { sqlConnection.release() } }
  }

  async linkReading(headers: qReadingFluenciesHeaders[], studentClassrooms: ObjectLiteral[], test: Test, userId: number, CONN: EntityManager) {
    for(let row of studentClassrooms) {
      const options = { where: { test: { id: test.id }, studentClassroom: { id: row.id } }}
      const stStatus = await CONN.findOne(StudentTestStatus, options)
      const el = { active: true, test, studentClassroom: row, observation: '', createdAt: new Date(), createdByUser: userId } as StudentTestStatus
      if(!stStatus) { await CONN.save(StudentTestStatus, el) }
      for(let exam of headers) {
        const options = { where: { readingFluencyExam: { id: exam.readingFluencyExamId }, test: { id: test.id }, student: { id: row?.student?.id ?? row?.student_id } } }
        const sReadingFluency = await CONN.findOne(ReadingFluency, options)
        if(!sReadingFluency) {
          const toSave = { createdAt: new Date(), createdByUser: userId, student: { id: row?.student?.id ?? row?.student_id }, test, readingFluencyExam: { id: exam.readingFluencyExamId } }
          await CONN.save(ReadingFluency, toSave)
        }
      }
    }
  }

  async stuQtsDuplicated(test: Test, testQuestions: TestQuestion[], classroomId: number, yearName: string, CONN: EntityManager, studentClassroomId: number | null) {

    const testQuestionsIds = testQuestions.map(testQuestion => testQuestion.id);

    let studentClassrooms = await CONN.getRepository(StudentClassroom)
      .createQueryBuilder("studentClassroom")
      .leftJoinAndSelect("studentClassroom.student", "student")
      .innerJoinAndSelect("studentClassroom.studentStatus", "studentStatus")
      .innerJoinAndSelect("studentStatus.test", "stStatusTest")
      .innerJoinAndSelect("stStatusTest.period", "period")
      .innerJoin("studentClassroom.year", "year")
      .innerJoinAndSelect("student.person", "person")
      .innerJoinAndSelect("studentClassroom.classroom", "classroom")
      .innerJoinAndSelect("classroom.school", "school")
      .leftJoinAndSelect("student.studentQuestions", "studentQuestions")
      .leftJoinAndSelect("studentQuestions.rClassroom", "rClassroom")
      .leftJoinAndSelect("studentQuestions.testQuestion", "testQuestion", "testQuestion.id IN (:...testQuestions)", { testQuestions: testQuestionsIds })
      .leftJoin("testQuestion.questionGroup", "questionGroup")
      .leftJoin("testQuestion.test", "test")
      .leftJoinAndSelect("student.studentDisabilities", "studentDisabilities", "studentDisabilities.endedAt IS NULL")
      .where("studentClassroom.classroom = :classroomId", { classroomId })
      .andWhere(new Brackets(qb => {
        if(studentClassroomId) {
          qb.andWhere("studentClassroom.id = :studentClassroomId", { studentClassroomId })
        }
        if(TEST_CATEGORIES_IDS.AVL_ITA === test.category.id){
          qb.andWhere("studentStatus.active = :active", { active: true })
        }
      }))
      .andWhere("(studentClassroom.startedAt < :testCreatedAt OR studentStatus.testId = :testId)", { testCreatedAt: test.createdAt, testId: test.id })
      .andWhere("testQuestion.test = :testId", { testId: test.id })
      .andWhere("stStatusTest.id = :testId", { testId: test.id })
      .andWhere("year.name = :yearName", { yearName })
      .andWhere("period.id = :periodId", { periodId: test.period.id })
      .orderBy("questionGroup.id", "ASC")
      .addOrderBy("testQuestion.order", "ASC")
      .addOrderBy("studentClassroom.rosterNumber", "ASC")
      .addOrderBy("person.name", "ASC")
      .getMany();

    return this.duplicatedStudents(studentClassrooms).map((sc: StudentClassroom) => ({ ...sc, studentStatus: sc.studentStatus.find((studentStatus: any) => studentStatus.test.id === test.id) })) as StudentClassroom[]
  }

  async stuClassReadF(test: Test, classroomId: number, yearName: string, CONN: EntityManager, studentClassroomId: number | null) {
    return await CONN.getRepository(StudentClassroom)
      .createQueryBuilder("studentClassroom")
      .leftJoin("studentClassroom.year", "year")
      .leftJoin("studentClassroom.studentStatus", "studentStatus")
      .leftJoin("studentStatus.test", "test", "test.id = :testId", { testId: test.id })
      .leftJoinAndSelect("studentClassroom.student", "student")
      .leftJoinAndSelect("student.readingFluency", "readingFluency")
      .leftJoin("student.person", "person")
      .where("studentClassroom.classroom = :classroomId", { classroomId })
      .andWhere(new Brackets(qb => {
        if(studentClassroomId) {
          qb.where("studentClassroom.id = :studentClassroomId", { studentClassroomId })
        }
      }))
      .andWhere(new Brackets(qb => {
        qb.where("studentClassroom.startedAt < :testCreatedAt", { testCreatedAt: test.createdAt });
        qb.orWhere("readingFluency.id IS NOT NULL")
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

    const sqlConnection = await dbConn()

    try {
      return await AppDataSource.transaction(async (CONN) => {
        const test = await this.getTest(Number(testId), Number(yearName), CONN)
        if(!test) { return { status: 404, message: "Teste não encontrado" } }
        if(!test.active) { return { status: 400, message: "Não é possível incluir um aluno em uma avaliação já encerrada." } }

        let data;
        switch (test.category.id) {
          case TEST_CATEGORIES_IDS.LITE_1:
          case TEST_CATEGORIES_IDS.LITE_2:
          case TEST_CATEGORIES_IDS.LITE_3: {
            data = await this.notIncludedAL(test, Number(classroomId), Number(yearName), CONN)
            break;
          }
          case TEST_CATEGORIES_IDS.READ_2:
          case TEST_CATEGORIES_IDS.READ_3: {
            data = await this.notIncludedRF(test, Number(classroomId), Number(yearName), CONN)
            break;
          }
          case TEST_CATEGORIES_IDS.AVL_ITA:
          case TEST_CATEGORIES_IDS.SIM_ITA: {
            data = await this.qNotTestIncluded(sqlConnection, yearName, Number(classroomId), test.id )
            break;
          }
        }
        return { status: 200, data };
      })
    }
    catch (error: any) { return { status: 500, message: error.message } }
    finally { if(sqlConnection) { sqlConnection.release() } }
  }

  async testQuestLink(status: boolean, arr: any[], test: Test, testQuestions: TestQuestion[], userId: number, CONN: EntityManager) {

    let added: string[] = []

    for(let sC of arr) {

      if(test.category.id === TEST_CATEGORIES_IDS.SIM_ITA) {
        // Pula alunos que já saíram da turma
        if(sC.endedAt != null) {

          const person = await CONN.findOne(Person, { where: { student: { id: sC.student?.id ?? sC.student_id } } })

          if(person?.name){
            added.push(person.name)
          }

          continue;
        }

        // Para SIM_ITA: busca por student.id (pode estar em qualquer turma)
        const options = { where: { test: { id: test.id }, studentClassroom: { student: { id: sC.student?.id ?? sC.student_id } } }}
        const stStatus = await CONN.findOne(StudentTestStatus, options)

        // Se já tem status para este teste, pula
        if(stStatus) {

          const person = await CONN.findOne(Person, { where: { student: { id: sC.student?.id ?? sC.student_id } } })

          if(person?.name){
            added.push(person.name)
          }

          continue;
        }
      }

      if(status){
        const options = { where: { test: { id: test.id }, studentClassroom: { id: sC.id } }}
        const stStatus = await CONN.findOne(StudentTestStatus, options)
        const el = { active: true, test, studentClassroom: sC, observation: '', createdAt: new Date(), createdByUser: userId } as StudentTestStatus
        if(!stStatus) { await CONN.save(StudentTestStatus, el) }
      }
      for(let tQ of testQuestions) {
        const options = { where: { testQuestion: { id: tQ.id, test: { id: test.id }, question: { id: tQ.question.id } }, student: { id: sC.student?.id ?? sC.student_id } } }
        const sQuestion = await CONN.findOne(StudentQuestion, options) as StudentQuestion
        if(!sQuestion) { await CONN.save(StudentQuestion, { answer: '', testQuestion: tQ, student: { id: sC.student?.id ?? sC.student_id }, createdAt: new Date(), createdByUser: userId })}
      }
    }

    return added
  }

  async qTestQuestLink(status: boolean, arr: qStudentsClassroomsForTest[], test: Test, testQuestions: TestQuestion[], userId: number, CONN: EntityManager) {
    for(let sC of arr) {

      if(test.category.id === TEST_CATEGORIES_IDS.SIM_ITA) {
        // Pula alunos que já saíram da turma
        if(sC.endedAt != null) { continue; }

        // Para SIM_ITA: busca por student.id (pode estar em qualquer turma)
        const options = { where: { test: { id: test.id }, studentClassroom: { student: { id: sC.student_id } } }}
        const stStatus = await CONN.findOne(StudentTestStatus, options)

        // Se já tem status para este teste, pula
        if(stStatus) { continue; }
      }

      if(status){
        // Para outros testes: busca por studentClassroom.id (turma específica)
        const options = { where: { test: { id: test.id }, studentClassroom: { id: sC.student_classroom_id } }}
        const stStatus = await CONN.findOne(StudentTestStatus, options)
        if(!stStatus) {
          const el = { active: true, test, studentClassroom: { id: sC.student_classroom_id }, observation: '', createdAt: new Date(), createdByUser: userId } as StudentTestStatus
          await CONN.save(StudentTestStatus, el)
        }
      }

      for(let tQ of testQuestions) {
        const options = { where: { testQuestion: { id: tQ.id, test: { id: test.id }, question: { id: tQ.question.id } }, student: { id: sC.student_id } } }
        const sQuestion = await CONN.findOne(StudentQuestion, options) as StudentQuestion
        if(!sQuestion) { await CONN.save(StudentQuestion, { answer: '', testQuestion: tQ, student: { id: sC.student_id }, createdAt: new Date(), createdByUser: userId })}
      }
    }
  }

  async deleteStudentFromTest(req: Request) {

    let sqlConnection = await dbConn()

    const studentClassroomId = !isNaN(parseInt(req.query.studentClassroomId as string)) ? parseInt(req.query.studentClassroomId as string) : null
    const testId = !isNaN(parseInt(req.query.testId as string)) ? parseInt(req.query.testId as string) : null
    const classroomId = !isNaN(parseInt(req.params.classroom as string)) ? parseInt(req.params.classroom as string) : null

    try {

      if(studentClassroomId === null || testId === null || classroomId === null) {
        return { status: 400, message: 'Parâmetros inválidos.' }
      }

      const qUserTeacher = await this.qTeacherByUser(sqlConnection, req.body.user.user)

      if(![pc.ADMN, pc.DIRE, pc.VICE, pc.COOR, pc.SECR].includes(qUserTeacher.person.category.id)) {
        return { status: 403, message: 'Você não tem permissão para acessar ou modificar este recurso.' }
      }

      const qTest = await this.qTestById(sqlConnection, testId)

      if(!qTest.active) {
        return { status: 403, message: 'Não é permitido realizar modificações em avaliações encerradas.' }
      }

      if(studentClassroomId && testId && classroomId) {
        await this.qSetInactiveStudentTest(sqlConnection, studentClassroomId, testId, classroomId, qUserTeacher.person.user.id)
      }

      return { status: 200, data: {} };
    }
    catch (error: any) {
      console.log('deleteStudent', error)
      return { status: 500, message: error.message }
    }
    finally { if(sqlConnection) { sqlConnection.release() } }
  }

  async insertStudents(req: Request) {

    let sqlConnection = await dbConn()

    const body = req.body as insertStudentsBody

    try {
      return await AppDataSource.transaction(async (CONN) => {

        const qUserTeacher = await this.qTeacherByUser(sqlConnection, body.user.user)

        const test = await this.getTest(body.test.id, body.year, CONN)

        if(!test) return { status: 404, message: "Teste não encontrado" }
        switch (test.category.id) {
          case (TEST_CATEGORIES_IDS.LITE_1):
          case (TEST_CATEGORIES_IDS.LITE_2):
          case (TEST_CATEGORIES_IDS.LITE_3): {
            const stClassrooms = await this.notIncludedAL(test, body.classroom.id, body.year, CONN)
            if(!stClassrooms || stClassrooms.length < 1) return { status: 404, message: "Alunos não encontrados." }
            const filteredSC = stClassrooms.filter(studentClassroom => body.studentClassrooms.includes(studentClassroom.id))
            for(let register of filteredSC){
              const sAlphabetic = await CONN.findOne(Alphabetic, { where: { test: { id: test.id }, student: { id: register.student_id } } } )
              if(!sAlphabetic) { await CONN.save(Alphabetic, { createdAt: new Date(), createdByUser: qUserTeacher.person.user.id, student: { id: register.student_id }, test } ) }
            }
            break;
          }

          case (TEST_CATEGORIES_IDS.READ_2):
          case (TEST_CATEGORIES_IDS.READ_3): {
            const stClassrooms = await this.notIncludedRF(test, body.classroom.id, body.year, CONN)
            if(!stClassrooms || stClassrooms.length < 1) return { status: 404, message: "Alunos não encontrados." }
            const filteredSC = stClassrooms.filter(studentClassroom => body.studentClassrooms.includes(studentClassroom.id))
            const headers = await this.qReadingFluencyHeaders(sqlConnection)
            await this.linkReading(headers, filteredSC, test, qUserTeacher.person.user.id, CONN)
            break;
          }

          case (TEST_CATEGORIES_IDS.AVL_ITA):
          case (TEST_CATEGORIES_IDS.SIM_ITA): {
            const stClassrooms = await this.qNotTestIncluded(sqlConnection, String(body.year), body.classroom.id, test.id )

            if(!stClassrooms || stClassrooms.length < 1) return { status: 404, message: "Alunos não encontrados." }
            const filteredSC = stClassrooms.filter(el => body.studentClassrooms.includes(el.id)) as unknown as StudentClassroom[]
            const testQuestions = await this.getTestQuestions(test.id, CONN)
            const linkResult = await this.testQuestLink(true, filteredSC, test, testQuestions, qUserTeacher.person.user.id, CONN)
            if(linkResult.length > 0) {
              return { status: 400, message: `${linkResult.join(', ')} já relizou a prova.` }
            }
            break;
          }
        }
        return { status: 200, data: {} };
      })
    }
    catch (error: any) {
      console.log('insertStudents', error)
      return { status: 500, message: error.message }
    }
    finally { if(sqlConnection) { sqlConnection.release() } }
  }

  async notIncludedRF(test: Test, classroomId: number, yearName: number, CONN: EntityManager) {
    return await CONN.getRepository(StudentClassroom)
      .createQueryBuilder("studentClassroom")
      .select([ 'studentClassroom.id AS id', 'studentClassroom.rosterNumber AS rosterNumber', 'studentClassroom.startedAt AS startedAt', 'studentClassroom.endedAt AS endedAt', 'person.name AS name', 'student.ra AS ra', 'student.dv AS dv' ])
      .leftJoin("studentClassroom.year", "year")
      .leftJoinAndSelect("studentClassroom.student", "student")
      .leftJoinAndSelect("student.readingFluency", "readingFluency")
      .leftJoin("studentClassroom.studentStatus", "studentStatus")
      .leftJoin("studentStatus.test", "test", "test.id = :testId", {testId: test.id})
      .leftJoin("student.person", "person")
      .where("studentClassroom.classroom = :classroomId", {classroomId})
      .andWhere("studentClassroom.startedAt > :testCreatedAt", {testCreatedAt: test.createdAt})
      .andWhere("studentClassroom.endedAt IS NULL")
      .andWhere("year.name = :yearName", {yearName})
      .andWhere("readingFluency.id IS NULL")
      .getRawMany() as unknown as notIncludedInterface[]
  }

  async notIncludedAL(test: Test, classroomId: number, yearName: number, CONN: EntityManager) {
    return await CONN.getRepository(StudentClassroom)
      .createQueryBuilder("studentClassroom")
      .select([ 'studentClassroom.id AS id', 'studentClassroom.rosterNumber AS rosterNumber', 'studentClassroom.startedAt AS startedAt', 'studentClassroom.endedAt AS endedAt', 'person.name AS name', 'student.ra AS ra', 'student.dv AS dv' ])
      .leftJoin("studentClassroom.year", "year")
      .leftJoinAndSelect("studentClassroom.student", "student")
      .leftJoin("student.alphabetic", "alphabetic")
      .leftJoin("student.person", "person")
      .where("studentClassroom.classroom = :classroomId", {classroomId})
      .andWhere("studentClassroom.startedAt > :testCreatedAt", {testCreatedAt: test.createdAt})
      .andWhere("studentClassroom.endedAt IS NULL")
      .andWhere("year.name = :yearName", {yearName})
      .andWhere("alphabetic.id IS NULL")
      .getRawMany()
  }

  async findAllByYear(req: Request) {

    let sqlConnection = await dbConn()

    try {
      return AppDataSource.transaction(async(CONN) => {

        const bimesterId = !isNaN(parseInt(req.query.bimester as string)) ? parseInt(req.query.bimester as string) : null
        const disciplineId = !isNaN(parseInt(req.query.discipline as string)) ? parseInt(req.query.discipline as string) : null
        const search = req.query.search as string
        const limit = !isNaN(parseInt(req.query.limit as string)) ? parseInt(req.query.limit as string) : 100
        const offset = !isNaN(parseInt(req.query.offset as string)) ? parseInt(req.query.offset as string) : 0

        let yearName = req.params.year

        if(yearName.length != 4) {
          const currentYear = await this.qCurrentYear(sqlConnection)
          yearName = currentYear.name
        }

        const qUserTeacher = await this.qTeacherByUser(sqlConnection, req.body.user.user)

        const masterTeacher =
          qUserTeacher.person.category.id === pc.ADMN ||
          qUserTeacher.person.category.id === pc.SUPE ||
          qUserTeacher.person.category.id === pc.FORM

        const { classrooms } = await this.qTeacherClassrooms(sqlConnection, req?.body.user.user)

        const { disciplines } = await this.qTeacherDisciplines(sqlConnection, req?.body.user.user);

        const testClasses = await CONN.getRepository(Test)
          .createQueryBuilder("test")
          .select([ 'test.id', 'test.name' ])
          .leftJoinAndSelect("test.period", "period")
          .leftJoinAndSelect("test.category", "category")
          .leftJoinAndSelect("period.year", "year")
          .leftJoinAndSelect("period.bimester", "bimester")
          .leftJoinAndSelect("test.discipline", "discipline")
          .leftJoinAndSelect("test.classrooms", "classroom")
          .leftJoinAndSelect("classroom.school", "school")
          .where(new Brackets(qb => {
            if (!masterTeacher) {
              qb.where("classroom.id IN (:...teacherClasses)", { teacherClasses: classrooms });
              qb.andWhere("discipline.id IN (:...teacherDisciplines)", { teacherDisciplines: disciplines });
            }
            if(bimesterId) { qb.andWhere("bimester.id = :bimesterId", { bimesterId }) }
            if(disciplineId) { qb.andWhere("discipline.id = :disciplineId", { disciplineId }) }
          }))
          .andWhere("year.name = :yearName", { yearName })
          .andWhere( new Brackets((qb) => {
            qb.where("test.name LIKE :search", { search: `%${ search }%` })
              .orWhere("classroom.shortName LIKE :search", { search: `%${ search }%` })
              .orWhere("school.name LIKE :search", { search: `%${ search }%` })
              .orWhere("school.shortName LIKE :search", { search: `%${ search }%` })
          }))
          .addOrderBy('school.shortName')
          .addOrderBy('classroom.shortName')
          .addOrderBy('test.name')
          .addOrderBy('discipline.name')
          .addOrderBy('bimester.name', 'DESC')
          .take(limit)
          .skip(offset)
          .groupBy('test.id, classroom.id, category.id, period.id, discipline.id, school.id')
          .getMany();

        return { status: 200, data: testClasses };
      })
    }
    catch (error: any) { return { status: 500, message: error.message } }
    finally { if(sqlConnection) { sqlConnection.release() } }
  }

  async getById(req: Request) {

    let sqlConnection = await dbConn()

    const { id } = req.params

    try {
      return await AppDataSource.transaction(async(CONN) => {
        const qUserTeacher = await this.qTeacherByUser(sqlConnection, req.body.user.user)
        const masterUser = qUserTeacher.person.category.id === pc.ADMN || qUserTeacher.person.category.id === pc.SUPE || qUserTeacher.person.category.id === pc.FORM;
        const op = { relations: ["period", "period.year", "period.bimester", "discipline", "category", "person", "classrooms.school"], where: { id: parseInt(id) } }
        const test = await CONN.findOne(Test, { ...op })
        if(qUserTeacher.person.id !== test?.person.id && !masterUser) return { status: 403, message: "Você não tem permissão para editar esse teste." }
        if (!test) { return { status: 404, message: 'Data not found' } }
        const testQuestions = await this.getTestQuestions(test.id, CONN)
        return { status: 200, data: { ...test, testQuestions } };
      })
    }
    catch (error: any) { return { status: 500, message: error.message } }
    finally { if(sqlConnection) { sqlConnection.release() } }
  }

  async saveTest(body: TestBodySave) {
    const classesIds = body.classroom.map((classroom: { id: number }) => classroom.id);
    let sqlConnection = await dbConn();

    try {
      return await AppDataSource.transaction(async (CONN) => {
        const qUserTeacher = await this.qTeacherByUser(sqlConnection, body.user.user);

        if([pc.MONI, pc.SECR].includes(qUserTeacher.person.category.id)) {
          return { status: 403, message: 'Você não tem permissão para criar uma avaliação.' };
        }

        if(!qUserTeacher) return { status: 404, message: "Usuário inexistente" };

        const checkYear = await CONN.findOne(Year, { where: { id: body.year.id } });
        if(!checkYear) return { status: 404, message: "Ano não encontrado" };
        if(!checkYear.active) return { status: 400, message: "Não é possível criar um teste para um ano letivo inativo." };

        const period = await CONN.findOne(Period, {
          relations: ["year", "bimester"],
          where: { year: body.year, bimester: body.bimester }
        });
        if(!period) return { status: 404, message: "Período não encontrado" };

        // Verifica duplicação para categorias LITE
        if([TEST_CATEGORIES_IDS.LITE_1, TEST_CATEGORIES_IDS.LITE_2, TEST_CATEGORIES_IDS.LITE_3].includes(body.category.id)) {
          const test = await CONN.findOne(Test, {
            where: { category: body.category, discipline: body.discipline, period: period }
          });
          if(test) {
            return { status: 409, message: `Já existe uma avaliação criada com a categoria, disciplina e período informados.` };
          }
        }

        // Verifica se há alunos nas turmas
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

        if(!classes || classes.length < 1) {
          return { status: 400, message: "Não existem alunos matriculados em uma ou mais salas informadas." };
        }

        // Cria o teste
        const test = new Test();
        test.name = body.name;
        test.category = body.category as TestCategory;
        test.discipline = body.discipline as Discipline;
        test.person = qUserTeacher.person as Person;
        test.period = period;
        test.classrooms = classes.map(el => ({ id: el.id })) as Classroom[];
        test.createdAt = new Date();
        test.createdByUser = qUserTeacher.person.user.id;

        await CONN.save(Test, test);

        // Processa questões se a categoria requer
        const haveQuestions = [
          TEST_CATEGORIES_IDS.LITE_2,
          TEST_CATEGORIES_IDS.LITE_3,
          TEST_CATEGORIES_IDS.SIM_ITA,
          TEST_CATEGORIES_IDS.AVL_ITA
        ];

        if(haveQuestions.includes(body.category.id) && body.testQuestions?.length) {
          const testQuestions = [];
          const classroomNumber = parseInt(classes[0].shortName.charAt(0))

          for (const tq of body.testQuestions) {
            let question = tq.question;
            // Se a questão não tem ID, cria uma nova
            if (!question.id) {
              // Valida apenas campos realmente obrigatórios
              if (!question.classroomCategory?.id) { return { status: 400, message: "Todas as questões devem ter categoria definida" } }

              // Prepara o objeto da questão
              const questionData: any = {
                title: question.title,
                images: question.images || 0,
                person: { id: question.person?.id || qUserTeacher.person.id },
                discipline: body.discipline,
                classroomNumber: classroomNumber,
                classroomCategory: { id: question.classroomCategory.id },
                createdAt: new Date(),
                createdByUser: qUserTeacher.person.user.id
              };

              // Adiciona skill apenas se existir
              if (question.skill?.id) { questionData.skill = { id: question.skill.id } }

              // Cria a questão
              const newQuestion = await CONN.save(Question, questionData);
              question = newQuestion;
            }

            // Prepara a TestQuestion
            testQuestions.push({
              order: tq.order,
              answer: tq.answer,
              questionGroup: { id: tq.questionGroup.id },
              active: tq.active,
              question: question,
              test: test,
              createdAt: new Date(),
              createdByUser: qUserTeacher.person.user.id
            });
          }

          // Salva todas as TestQuestions
          await CONN.save(TestQuestion, testQuestions);
        }
        return { status: 201, data: test };
      });
    }
    catch (error: any) { return { status: 500, message: error.message } }
    finally { if(sqlConnection) { sqlConnection.release() } }
  }

  async updateTest(id: number | string, req: Request) {
    let sqlConnection = await dbConn()

    try {
      return await AppDataSource.transaction(async (CONN) => {
        const uTeacher = await this.qTeacherByUser(sqlConnection, req.body.user.user)
        const userId = uTeacher.person.user.id
        const masterUser = uTeacher.person.category.id === pc.ADMN ||
          uTeacher.person.category.id === pc.SUPE ||
          uTeacher.person.category.id === pc.FORM;

        const test = await CONN.findOne(Test, { relations: ["person", "discipline"], where: { id: Number(id) } })
        if(!test) return { status: 404, message: "Teste não encontrado" }
        if(uTeacher.person.id !== test.person.id && !masterUser)
          return { status: 403, message: "Você não tem permissão para editar esse teste." }

        // Atualiza dados básicos do teste
        test.name = req.body.name
        test.active = req.body.active
        test.updatedAt = new Date()
        test.updatedByUser = userId
        await CONN.save(Test, test)

        if(req.body.testQuestions?.length) {
          const bodyTq = req.body.testQuestions as TestQuestion[]
          const dataTq = await this.getTestQuestions(test.id, CONN)

          for (let next of bodyTq) {
            const curr = dataTq.find(el => el.id === next.id);

            if (!curr) {
              // NOVA QUESTÃO - precisa criar Question primeiro se não existir
              let questionToSave = next.question;

              // Se a questão não tem ID, é uma questão completamente nova
              if (!questionToSave.id) {
                // Valida apenas campos realmente obrigatórios
                if (!questionToSave.classroomCategory?.id) {
                  return {
                    status: 400,
                    message: "Questão nova deve ter categoria definida"
                  }
                }

                // Prepara o objeto da questão
                const questionData: any = {
                  title: questionToSave.title,
                  images: questionToSave.images || 0,
                  person: { id: questionToSave.person?.id || uTeacher.person.id },
                  discipline: { id: test.discipline.id },
                  classroomCategory: { id: questionToSave.classroomCategory.id },
                  createdAt: new Date(),
                  createdByUser: userId
                };

                // Adiciona skill apenas se existir
                if (questionToSave.skill?.id) {
                  questionData.skill = { id: questionToSave.skill.id };
                }

                // Cria a nova questão
                const newQuestion = await CONN.save(Question, questionData);
                questionToSave = newQuestion;
              }

              // Cria a TestQuestion
              await CONN.save(TestQuestion, {
                order: next.order,
                answer: next.answer,
                questionGroup: next.questionGroup,
                active: next.active,
                question: questionToSave,
                test: test,
                createdAt: new Date(),
                createdByUser: userId
              });

            } else {
              // QUESTÃO EXISTENTE - atualiza se houver mudanças
              const testQuestionCondition = this.diffs(curr, next);
              if (testQuestionCondition) {
                await CONN.save(TestQuestion, {
                  ...next,
                  createdAt: curr.createdAt,
                  createdByUser: curr.createdByUser,
                  updatedAt: new Date(),
                  updatedByUser: userId
                })
              }

              // Atualiza a Question se houver mudanças
              if (this.diffs(curr.question, next.question)) {
                await CONN.save(Question, {
                  ...next.question,
                  createdAt: curr.question.createdAt,
                  createdByUser: curr.question.createdByUser,
                  updatedAt: new Date(),
                  updatedByUser: userId
                })
              }

              // Atualiza Skill apenas se existir e houver mudanças
              if (next.question.skill && this.diffs(curr.question.skill, next.question.skill)) {
                await CONN.save(Skill, {
                  ...next.question.skill,
                  createdAt: curr.question.skill.createdAt,
                  createdByUser: curr.question.skill.createdByUser,
                  updatedAt: new Date(),
                  updatedByUser: userId
                })
              }

              // Atualiza QuestionGroup se houver mudanças
              if (next.questionGroup && this.diffs(curr.questionGroup, next.questionGroup)) {
                await CONN.save(QuestionGroup, {
                  ...next.questionGroup,
                  createdAt: curr.questionGroup.createdAt,
                  createdByUser: curr.questionGroup.createdByUser,
                  updatedAt: new Date(),
                  updatedByUser: userId
                })
              }
            }
          }
        }

        const result = (await this.findOneById(id, req, CONN)).data
        return { status: 200, data: result };
      })
    }
    catch (error: any) {
      return { status: 500, message: error.message }
    }
    finally {
      if(sqlConnection) { sqlConnection.release() }
    }
  }

  async getTest(testId: number | string , yearName: number | string, CONN: EntityManager) {
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

  async getTestQuestions(testId: number, CONN: EntityManager, selectFields?: string[]) {
    const fields = ["testQuestion.id", "testQuestion.order", "testQuestion.answer", "testQuestion.active", "question.id", "question.title", "question.images", "person.id", "question.person", "skill.id", "skill.reference", "skill.description", "discipline.id", "discipline.name", "classroomCategory.id", "classroomCategory.name", "questionGroup.id", "questionGroup.name"]
    return await CONN.getRepository(TestQuestion)
      .createQueryBuilder("testQuestion")
      .select(selectFields ?? fields)
      .leftJoin("testQuestion.question", "question")
      .leftJoin("question.person", "person")
      .leftJoin("question.discipline", "discipline")
      .leftJoin("question.classroomCategory", "classroomCategory")
      .leftJoin("question.skill", "skill")
      .leftJoin("testQuestion.questionGroup", "questionGroup")
      .where("testQuestion.test = :testId", {testId})
      .orderBy("questionGroup.id", "ASC")
      .addOrderBy("testQuestion.order", "ASC")
      .getMany()
  }

  async getReadingFluencyStudents(test: Test, classroomId: number, yearName: string, CONN: EntityManager, studentClassroomId: number | null) {
    let studentClassrooms = await CONN.getRepository(StudentClassroom)
      .createQueryBuilder("studentClassroom")
      .leftJoinAndSelect("studentClassroom.student", "student")
      .leftJoinAndSelect("student.readingFluency", "readingFluency")
      .leftJoinAndSelect("readingFluency.rClassroom", "rClassroom")
      .leftJoinAndSelect("studentClassroom.studentStatus", "studentStatus")
      .leftJoinAndSelect("readingFluency.readingFluencyExam", "readingFluencyExam")
      .leftJoinAndSelect("readingFluency.readingFluencyLevel", "readingFluencyLevel")
      .leftJoinAndSelect("studentStatus.test", "stStatusTest")
      .leftJoinAndSelect("readingFluency.test", "stReadFluenTest")
      .leftJoinAndSelect("studentClassroom.year", "year")
      .leftJoinAndSelect("student.person", "person")
      .leftJoinAndSelect("studentClassroom.classroom", "classroom")
      .leftJoinAndSelect("student.studentDisabilities", "studentDisabilities", "studentDisabilities.endedAt IS NULL")
      .where("studentClassroom.classroom = :classroomId", { classroomId })
      .andWhere(new Brackets(qb => {
        if(studentClassroomId) {
          qb.where("studentClassroom.id = :studentClassroomId", { studentClassroomId })
        }
      }))
      .andWhere(new Brackets(qb => {
        qb.where("studentClassroom.startedAt < :testCreatedAt", { testCreatedAt: test.createdAt })
        qb.orWhere("readingFluency.id IS NOT NULL")
      }))
      .andWhere("stReadFluenTest.id = :testId", { testId: test.id })
      .andWhere("stStatusTest.id = :testId", { testId: test.id })
      .andWhere("year.name = :yearName", { yearName })
      .addOrderBy("studentClassroom.rosterNumber", "ASC")
      .addOrderBy("person.name", "ASC")
      .getMany()

    return this.duplicatedStudents(studentClassrooms).map((sc: any) => ({ ...sc, studentStatus: sc.studentStatus.find((studentStatus: any) => studentStatus.test.id === test.id) }))
  }

  async getTestForGraphic(testId: string, yearId: string, CONN: EntityManager, sqlConnection: PoolConnection) {

    const testQuestions = await this.qTestQuestions(sqlConnection, testId) as TestQuestion[]

    if (!testQuestions) return { status: 404, message: "Questões não encontradas" }
    const testQuestionsIds = testQuestions.map(testQuestion => testQuestion.id)

    const test = await CONN.getRepository(Test)
      .createQueryBuilder("test")
      .select(['test.id', 'test.name'])
      .leftJoinAndSelect("test.period", "period")
      .leftJoinAndSelect("period.bimester", "periodBimester")
      .leftJoin("period.year", "periodYear")
      .addSelect(['periodYear.id', 'periodYear.name', 'periodYear.active'])
      .leftJoinAndSelect("test.discipline", "discipline")
      .leftJoinAndSelect("test.category", "category")
      .leftJoin("test.person", "testPerson")
      .addSelect(['testPerson.id', 'testPerson.name'])
      .leftJoinAndSelect("test.classrooms", "classroom")
      .leftJoinAndSelect("classroom.school", "school")
      .leftJoin("classroom.studentClassrooms", "studentClassroom")
      .addSelect(['studentClassroom.id', 'studentClassroom.student', 'studentClassroom.classroom', 'studentClassroom.endedAt'])
      .leftJoinAndSelect("studentClassroom.studentStatus", "studentStatus")
      .leftJoinAndSelect("studentStatus.test", "studentStatusTest")
      .leftJoin("studentClassroom.student", "student")
      .addSelect(['student.id'])
      .leftJoinAndSelect("student.studentQuestions", "studentQuestions")
      .leftJoinAndSelect("studentQuestions.rClassroom", "rClassroom")
      .leftJoinAndSelect("studentQuestions.testQuestion", "testQuestion", "testQuestion.id IN (:...testQuestions)", { testQuestions: testQuestionsIds })
      .leftJoinAndSelect("testQuestion.questionGroup", "questionGroup")
      .leftJoinAndSelect("student.person", "studentPerson")
      .leftJoin("studentClassroom.year", "studentClassroomYear")
      .where("test.id = :testId", { testId })
      .andWhere("classroom.id NOT IN (:...classroomsIds)", { classroomsIds: [1216,1217,1218] })
      .andWhere("periodYear.id = :yearId", { yearId })
      .andWhere("studentClassroomYear.id = :yearId", { yearId })
      .andWhere("testQuestion.test = :testId", { testId })
      .andWhere("studentStatusTest.id = :testId", { testId })
      .orderBy("questionGroup.id", "ASC")
      .addOrderBy("testQuestion.order", "ASC")
      // .addOrderBy("studentClassroom.rosterNumber", "ASC")
      .addOrderBy("classroom.shortName", "ASC")
      .getOne()
    return { test, testQuestions }
  }

  async getReadingFluencyForGraphic(testId: string, yearId: string, CONN: EntityManager) {
    let data = await CONN.getRepository(Test)
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
      .leftJoinAndSelect("studentClassroom.classroom", "currentClassroom")
      .leftJoinAndSelect("studentClassroom.studentStatus", "studentStatus")
      .leftJoinAndSelect("studentStatus.test", "studentStatusTest")
      .leftJoinAndSelect("studentClassroom.student", "student")
      .leftJoinAndSelect("student.readingFluency", "readingFluency")
      .leftJoinAndSelect("readingFluency.rClassroom", "rClassroom")
      .leftJoinAndSelect("readingFluency.readingFluencyExam", "readingFluencyExam")
      .leftJoinAndSelect("readingFluency.readingFluencyLevel", "readingFluencyLevel")
      .leftJoinAndSelect("student.person", "studentPerson")
      .leftJoin("studentClassroom.year", "studentClassroomYear")
      .where("test.id = :testId", { testId })
      .andWhere("classroom.id NOT IN (:...classroomsIds)", { classroomsIds: [1216,1217,1218] })
      .andWhere("periodYear.id = :yearId", { yearId })
      .andWhere("studentClassroomYear.id = :yearId", { yearId })
      .andWhere("readingFluency.test = :testId", { testId })
      .andWhere("studentStatusTest.id = :testId", { testId })
      .addOrderBy("classroom.shortName", "ASC")
      .getOne()

    if(data) {
      data = {
        ...data,
        classrooms: data.classrooms.map(classroom => {
          const studentClassrooms = this.duplicatedStudents(classroom.studentClassrooms).filter((el: any) => !el.ignore) as StudentClassroom[]
          return { ...classroom, studentClassrooms }
        })
      }
    }

    return data
  }

  async alphabeticTest(
    questions: boolean,
    aHeaders: AlphaHeaders[],
    test: Test,
    sC: qAlphaStuClassroomsFormated[],
    room: Classroom,
    classId: number,
    userId: number,
    CONN: EntityManager,
    sqlConn: PoolConnection,
    studentClassroomId: number | null
  ) {

    await this.qCreateLinkAlphabetic(sC, test, userId, sqlConn)

    const qTests = await this.qAlphabeticTests(sqlConn, test.category.id, test.discipline.id, test.period.year.name) as unknown as Test[]

    const testsMap = new Map(qTests.map(t => [t.period.bimester.id, t]));

    let headers = aHeaders.map(bi => {
      const test = testsMap.get(bi.id);
      return { ...bi, currTest: { id: test?.id, active: test?.active } };
    });

    let preResultScWd = await this.qAlphaStudents(sqlConn, test, classId, test.period.year.id, studentClassroomId)

    let preResultSc = await this.qStudentDisabilities(sqlConn, preResultScWd) as unknown as StudentClassroom[]

    if (questions) {
      // ========== OTIMIZAÇÃO 1: Buscar todas as questões de uma vez ==========
      const testIds = qTests.map(t => t.id);

      // Query única para buscar TODAS as questões
      const batchQuery = `
        SELECT 
          tq.id AS test_question_id, 
          tq.order AS test_question_order, 
          tq.answer AS test_question_answer, 
          tq.active AS test_question_active,
          tq.testId AS test_id,
          qt.id AS question_id,
          qg.id AS question_group_id, 
          qg.name AS question_group_name,
          sk.id AS skill_id, 
          sk.reference AS skill_reference, 
          sk.description AS skill_description
        FROM test_question AS tq
        INNER JOIN question AS qt ON tq.questionId = qt.id
        LEFT JOIN skill AS sk ON qt.skillId = sk.id
        INNER JOIN question_group AS qg ON tq.questionGroupId = qg.id
        INNER JOIN test AS tt ON tq.testId = tt.id
        WHERE tt.id IN (${testIds.map(() => '?').join(',')})
        ORDER BY tt.id, qg.id, tq.order
      `;

      const [batchResult] = await sqlConn.query(batchQuery, testIds);
      const allQuestionsRaw = batchResult as any

      // Agrupar questões por test_id
      const questionsByTestId = new Map<number, any[]>();
      allQuestionsRaw.forEach((q: any) => {
        const testId = q.test_id;
        if (!questionsByTestId.has(testId)) { questionsByTestId.set(testId, []) }
        questionsByTestId.get(testId)!.push(q);
      });

      // ========== OTIMIZAÇÃO 2: Processar e associar questões ==========
      let testQuestionsIds: number[] = [];

      // Formatar questões para cada teste
      for (let test of qTests) {
        const rawQuestions = questionsByTestId.get(test.id) || [];
        const testQuestions = this.formatTestQuestions(rawQuestions) as unknown as TestQuestion[];

        test.testQuestions = testQuestions;
        testQuestionsIds = [ ...testQuestionsIds, ...testQuestions.map(testQuestion => testQuestion.id) ];
      }

      // ========== OTIMIZAÇÃO 3: Processar testQuestLink em paralelo ==========
      await Promise.all(qTests.map(test => this.testQuestLink(false, preResultSc, test, test.testQuestions, userId, CONN)));

      // ========== OTIMIZAÇÃO 4: Usar Map para lookup O(1) ==========
      const testsMap = new Map(qTests.map(t => [t.period.bimester.id, t]));

      headers = headers.map(bi => { return {...bi, testQuestions: testsMap.get(bi.id)?.testQuestions } });

      // Manter chamada original sem alterações
      const currentResult = await this.alphaQuestions(test.period.year.name, test, testQuestionsIds, sqlConn, classId, studentClassroomId );
      preResultSc = currentResult.flatMap(school => school.classrooms.flatMap((classroom: any) => classroom.studentClassrooms));
    }

    let studentClassrooms = preResultSc.map(el => ({
      ...el,
      studentRowTotal: el.student.alphabetic.reduce((acc, curr) => acc + (curr.alphabeticLevel?.id ? 1 : 0), 0)
    }))

    const studentCount = studentClassrooms.reduce((acc, item) => {
      acc[item.student.id] = (acc[item.student.id] || 0) + 1;
      return acc
    }, {} as Record<number, number>);

    studentClassrooms = studentClassrooms.reduce((acc: any[], item: any) => {
      const isDuplicated = studentCount[item.student.id] > 1;
      if (isDuplicated && item.endedAt) { return acc }

      const newItem = { ...item };

      newItem.student.alphabetic = newItem.student.alphabetic.map((alpha: any) => {
        if (alpha.rClassroom?.id && alpha.rClassroom.id != room.id) { return { ...alpha, gray: true } }
        return alpha
      })

      newItem.student.studentQuestions = newItem.student.studentQuestions?.map((sQ: any) => {
        if (sQ.rClassroom?.id && sQ.rClassroom.id != room.id) {
          if (item.endedAt) { return { ...sQ, answer: 'TR' } }
          return { ...sQ, answer: 'OE' }
        }
        return { ...sQ }
      })

      acc.push(newItem);
      return acc;
    }, []);

    const allAlphabetic = studentClassrooms.flatMap(el => el.student.alphabetic)

    for(let el of studentClassrooms.flatMap(sc => sc.student.studentDisabilities)) {
      el.disability = await CONN.findOne(Disability, { where: { studentDisabilities: el } }) as Disability
    }

    const isValidAnswer = (answer: any) => { return answer && answer !== 'null' && answer.length > 0 && answer.trim() !== '' }

    const validStudentClassrooms = studentClassrooms;

    headers = headers.map((bim: any) => {
      let bimesterCounter = 0;

      const studentClassroomsBi = validStudentClassrooms.filter(sc =>
        sc.student.studentQuestions?.some((sq: any) =>
          sq.rClassroom?.id === room.id &&
          sq.testQuestion.test.period.bimester.id === bim.id &&
          isValidAnswer(sq.answer)
        )
      );

      const relevantStudentQuestions = studentClassroomsBi.flatMap(sc =>
        (sc.student.studentQuestions || []).filter((sq: any) =>
          sq.rClassroom?.id === classId &&
          sq.testQuestion.test.period.bimester.id === bim.id
        )
      );

      const questionsByTestQuestionId = new Map();
      relevantStudentQuestions.forEach((sq: any) => {
        const tqId = sq.testQuestion?.id;
        if (!tqId) return;

        if (!questionsByTestQuestionId.has(tqId)) { questionsByTestQuestionId.set(tqId, []) }
        questionsByTestQuestionId.get(tqId).push(sq);
      });

      const testQuestions = bim.testQuestions?.map((tQ: any) => {
        if (!tQ.active) { return { ...tQ, counter: 0, counterPercentage: 0 } }

        const studentQuestions = questionsByTestQuestionId.get(tQ.id) || [];

        const counter = studentQuestions.reduce((acc: number, sQ: any) => {
          if (isValidAnswer(sQ.answer) && tQ.answer?.includes(sQ.answer.toUpperCase())) { return acc + 1 }
          return acc;
        }, 0);

        return { ...tQ, counter, counterPercentage: studentClassroomsBi.length > 0 ? Math.floor((counter / studentClassroomsBi.length) * 10000) / 100 : 0 };
      });

      const biAlpha = allAlphabetic.filter((a: any) =>
        a.rClassroom?.id === classId &&
        a.test.period.bimester.id === bim.id
      );

      const levels = bim.levels.map((l: any) => {
        const levelCounter = biAlpha.reduce((acc: number, prev: any) => {
          return acc + (prev.alphabeticLevel?.id === l.id ? 1 : 0);
        }, 0);

        bimesterCounter += levelCounter;
        return { ...l, levelCounter };
      });

      const levelsWithPercentage = levels.map((level: any) => ({
        ...level,
        levelPercentage: bimesterCounter > 0
          ? Math.floor((level.levelCounter / bimesterCounter) * 10000) / 100
          : 0
      }));

      return {
        ...bim,
        bimesterCounter,
        testQuestions,
        levels: levelsWithPercentage
      };
    });

    return { test, studentClassrooms, classroom: room, alphabeticHeaders: headers }
  }

  async alphaQuestions(yearName: string, test: any, testQuestionsIds: number[], conn: PoolConnection, classroomId?: number, studentClassroomId?: number | null) {

    const hasQuestions = !!testQuestionsIds.length;
    const testQuestionsPlaceholders = hasQuestions && testQuestionsIds.length > 0
      ? testQuestionsIds.map(() => '?').join(',')
      : '';

    let query = `
    SELECT 
      -- School
      s.id AS school_id,
      s.name AS school_name,
      s.shortName AS school_shortName,
      
      -- Classroom
      c.id AS classroom_id,
      c.name AS classroom_name,
      c.shortName AS classroom_shortName,
      
      -- StudentClassroom
      sc.id AS studentClassroom_id,
      sc.rosterNumber,
      sc.endedAt AS studentClassroom_endedAt,
      
      -- Student
      st.id AS student_id,
      
      -- Person
      p.id AS person_id,
      p.name AS person_name,
      
      -- AlphabeticFirst
      af.id AS alphabeticFirst_id,
      afl.id AS alphabeticFirst_level_id,
      afl.name AS alphabeticFirst_level_name,
      afl.shortName AS alphabeticFirst_level_shortName,
      afl.color AS alphabeticFirst_level_color,
      
      -- Alphabetic
      a.id AS alphabetic_id,
      a.observation AS alphabetic_observation,
      al.id AS alphabetic_level_id,
      al.name AS alphabetic_level_name,
      al.shortName AS alphabetic_level_shortName,
      al.color AS alphabetic_level_color,
      arc.id AS alphabetic_rClassroom_id,
      arc.name AS alphabetic_rClassroom_name,
      arc.shortName AS alphabetic_rClassroom_shortName,
      at.id AS alpha_test_id,
      at.name AS alpha_test_name,
      atp.id AS alpha_test_period_id,
      atb.id AS alpha_test_bimester_id,
      atb.name AS alpha_test_bimester_name,
      aty.id AS alpha_test_year_id,
      aty.name AS alpha_test_year_name,
      
      -- StudentDisability
      sd.id AS studentDisability_id,
      sd.disabilityId AS disability_id,
      d.name AS disability_name`;

    if (hasQuestions) {
      query += `,
      -- StudentQuestion
      sq.id AS studentQuestion_id,
      sq.answer AS studentQuestion_answer,
      sqrc.id AS studentQuestion_rClassroom_id,
      tq.id AS testQuestion_id,
      tq.order AS testQuestion_order,
      tq.answer AS testQuestion_answer,
      tq.active AS testQuestion_active,
      t.id AS test_id,
      t.name AS test_name,
      per.id AS period_id,
      bim.id AS bimester_id,
      bim.name AS bimester_name,
      py.id AS period_year_id,
      py.name AS period_year_name`;
    }

    query += `
    FROM school s
    LEFT JOIN classroom c ON c.schoolId = s.id
    LEFT JOIN student_classroom sc ON sc.classroomId = c.id
    LEFT JOIN year scy ON sc.yearId = scy.id
    LEFT JOIN student st ON sc.studentId = st.id
    LEFT JOIN person p ON st.personId = p.id
    LEFT JOIN alphabetic_first af ON af.studentId = st.id
    LEFT JOIN alphabetic_level afl ON af.alphabeticFirstId = afl.id
    LEFT JOIN alphabetic a ON a.studentId = st.id
    LEFT JOIN alphabetic_level al ON a.alphabeticLevelId = al.id
    LEFT JOIN classroom arc ON a.rClassroomId = arc.id
    LEFT JOIN test at ON a.testId = at.id
    LEFT JOIN test_category atc ON at.categoryId = atc.id
    LEFT JOIN discipline atd ON at.disciplineId = atd.id
    LEFT JOIN period atp ON at.periodId = atp.id
    LEFT JOIN bimester atb ON atp.bimesterId = atb.id
    LEFT JOIN year aty ON atp.yearId = aty.id
    LEFT JOIN student_disability sd ON sd.studentId = st.id AND sd.endedAt IS NULL
    LEFT JOIN disability d ON sd.disabilityId = d.id`;

    if (hasQuestions) {
      query += `
    LEFT JOIN student_question sq ON sq.studentId = st.id
    LEFT JOIN classroom sqrc ON sq.rClassroomId = sqrc.id
    LEFT JOIN test_question tq ON sq.testQuestionId = tq.id ${testQuestionsPlaceholders ? `AND tq.id IN (${testQuestionsPlaceholders})` : ''}
    LEFT JOIN test t ON tq.testId = t.id
    LEFT JOIN test_category tc ON t.categoryId = tc.id
    LEFT JOIN discipline td ON t.disciplineId = td.id
    LEFT JOIN period per ON t.periodId = per.id
    LEFT JOIN bimester bim ON per.bimesterId = bim.id
    LEFT JOIN year py ON per.yearId = py.id`;
    }

    query += `
    WHERE s.id NOT IN (28, 29)
    AND c.id NOT IN (1216, 1217, 1218)
    AND atd.id = ?
    AND atc.id = ?
    AND aty.name = ?
    AND scy.name = ?`;

    if (hasQuestions) {
      query += `
    AND (sc.startedAt < ? OR a.id IS NOT NULL OR sq.id IS NOT NULL)
    AND tc.id = ?
    AND td.id = ?
    AND py.name = ?`;
    } else {
      query += `
    AND (sc.startedAt < ? OR a.id IS NOT NULL)`;
    }

    if (classroomId) query += ` AND sc.classroomId = ?`;
    if (studentClassroomId) query += ` AND sc.id = ?`;

    query += `
    ORDER BY sc.rosterNumber ASC, c.shortName ASC, s.shortName ASC`;

    if (hasQuestions) {
      query += `, bim.id ASC, tq.order ASC`;
    }

    // Parâmetros
    const params: any[] = [];
    if (hasQuestions && testQuestionsIds.length > 0) {
      params.push(...testQuestionsIds);
    }

    params.push(
      test.discipline?.id ?? test.discipline_id,
      test.category?.id ?? test.test_category_id,
      yearName,
      yearName,
      test.createdAt
    );

    if (hasQuestions) {
      params.push(
        test.category?.id ?? test.test_category_id,
        test.discipline?.id ?? test.discipline_id,
        yearName
      );
    }

    if (classroomId) params.push(classroomId);
    if (studentClassroomId) params.push(studentClassroomId);

    const [rows] = await conn.query(query, params);

    // Formatar resultado mantendo a estrutura do TypeORM
    const schoolsMap = new Map();

    for (const row of rows as any[]) {
      if (!row.school_id) continue;

      if (!schoolsMap.has(row.school_id)) {
        schoolsMap.set(row.school_id, {
          id: row.school_id,
          name: row.school_name,
          shortName: row.school_shortName,
          classrooms: []
        });
      }

      const school = schoolsMap.get(row.school_id);
      let classroom = school.classrooms.find((c: any) => c.id === row.classroom_id);

      if (!classroom) {
        classroom = {
          id: row.classroom_id,
          name: row.classroom_name,
          shortName: row.classroom_shortName,
          school: {
            id: row.school_id,
            name: row.school_name,
            shortName: row.school_shortName
          },
          studentClassrooms: []
        };
        school.classrooms.push(classroom);
      }

      let studentClassroom = classroom.studentClassrooms.find((sc: any) => sc.id === row.studentClassroom_id);

      if (!studentClassroom) {
        studentClassroom = {
          id: row.studentClassroom_id,
          rosterNumber: row.rosterNumber,
          endedAt: row.studentClassroom_endedAt,
          classroom: {
            id: row.classroom_id,
            name: row.classroom_name,
            shortName: row.classroom_shortName
          },
          student: {
            id: row.student_id,
            person: {
              id: row.person_id,
              name: row.person_name
            },
            alphabeticFirst: null,
            alphabetic: [],
            studentDisabilities: [],
            studentQuestions: hasQuestions ? [] : undefined
          }
        };

        if (row.alphabeticFirst_id) {
          studentClassroom.student.alphabeticFirst = {
            id: row.alphabeticFirst_id,
            alphabeticFirst: row.alphabeticFirst_level_id ? {
              id: row.alphabeticFirst_level_id,
              name: row.alphabeticFirst_level_name,
              shortName: row.alphabeticFirst_level_shortName,
              color: row.alphabeticFirst_level_color
            } : null
          };
        }

        classroom.studentClassrooms.push(studentClassroom);
      }

      // Adicionar Alphabetic
      if (row.alphabetic_id && !studentClassroom.student.alphabetic.find((a: any) => a.id === row.alphabetic_id)) {
        studentClassroom.student.alphabetic.push({
          id: row.alphabetic_id,
          observation: row.alphabetic_observation,
          alphabeticLevel: row.alphabetic_level_id ? {
            id: row.alphabetic_level_id,
            name: row.alphabetic_level_name,
            shortName: row.alphabetic_level_shortName,
            color: row.alphabetic_level_color
          } : null,
          rClassroom: row.alphabetic_rClassroom_id ? {
            id: row.alphabetic_rClassroom_id,
            name: row.alphabetic_rClassroom_name,
            shortName: row.alphabetic_rClassroom_shortName
          } : null,
          test: {
            id: row.alpha_test_id,
            name: row.alpha_test_name,
            period: {
              id: row.alpha_test_period_id,
              bimester: {
                id: row.alpha_test_bimester_id,
                name: row.alpha_test_bimester_name
              },
              year: {
                id: row.alpha_test_year_id,
                name: row.alpha_test_year_name
              }
            }
          }
        });
      }

      // Adicionar StudentDisability
      if (row.studentDisability_id && !studentClassroom.student.studentDisabilities.find((d: any) => d.id === row.studentDisability_id)) {
        studentClassroom.student.studentDisabilities.push({
          id: row.studentDisability_id,
          disability: {
            id: row.disability_id,
            name: row.disability_name
          }
        });
      }

      // Adicionar StudentQuestion se houver
      if (hasQuestions && row.studentQuestion_id && !studentClassroom.student.studentQuestions.find((q: any) => q.id === row.studentQuestion_id)) {
        studentClassroom.student.studentQuestions.push({
          id: row.studentQuestion_id,
          answer: row.studentQuestion_answer || '',
          rClassroom: row.studentQuestion_rClassroom_id ? {
            id: row.studentQuestion_rClassroom_id
          } : null,
          testQuestion: row.testQuestion_id ? {
            id: row.testQuestion_id,
            order: row.testQuestion_order,
            answer: row.testQuestion_answer,
            active: row.testQuestion_active,
            test: {
              id: row.test_id,
              name: row.test_name,
              period: {
                id: row.period_id,
                bimester: {
                  id: row.bimester_id,
                  name: row.bimester_name
                },
                year: {
                  id: row.period_year_id,
                  name: row.period_year_name
                }
              }
            }
          } : null
        });
      }
    }

    return Array.from(schoolsMap.values());
  }

  duplicatedStudents(studentClassrooms: StudentClassroom[] | qStudentClassroomFormated[]): any {
    const count = studentClassrooms.reduce((acc, item) => { acc[item.student.id] = (acc[item.student.id] || 0) + 1; return acc }, {} as Record<number, number>);
    const duplicatedStudents = studentClassrooms.filter(item => count[item.student.id] > 1).map(d => d.endedAt ? { ...d, ignore: true } : d)
    return studentClassrooms.map(item => { const duplicated = duplicatedStudents.find(d => d.id === item.id); return duplicated ? duplicated : item });
  }

  alphabeticTotalizators(onlyClasses: Classroom[], headers: AlphaHeaders[]) {
    // Função auxiliar para validar respostas
    const isValidAnswer = (answer: any): boolean => {
      return answer && answer !== 'null' && answer.length > 0 && answer.trim() !== '';
    }

    return onlyClasses.map(c => {
      // Preparar studentClassrooms uma única vez
      let studentClassrooms = c.studentClassrooms.map(el => ({
        ...el,
        studentRowTotal: el.student.alphabetic.reduce((acc, curr) =>
          acc + (curr.alphabeticLevel?.id ? 1 : 0), 0
        )
      }))

      studentClassrooms = this.duplicatedStudents(studentClassrooms)

      // Filtrar uma vez e reusar
      const activeStudentClassrooms = studentClassrooms.filter((el: any) => !el.ignore)
      const allAlphabetic = activeStudentClassrooms.flatMap(el => el.student.alphabetic)

      const totals = headers.map(bim => {
        let bimesterCounter = 0;

        // Cache studentClassrooms por bimester
        const studentClassroomsBi = activeStudentClassrooms.filter(sc =>
          sc.student.studentQuestions?.some(sq =>
            sq.rClassroom?.id === c.id &&
            sq.testQuestion?.test?.period?.bimester?.id === bim.id &&
            isValidAnswer(sq.answer)
          )
        )

        // Cache todas as questões válidas do bimestre
        const validStudentQuestions = studentClassroomsBi
          .flatMap(sc => sc.student.studentQuestions)
          .filter(sq => sq.rClassroom?.id === c.id && isValidAnswer(sq.answer))

        // Criar Map para lookup O(1) de questões por ID
        const questionsByTestQuestionId = new Map()
        for (const sq of validStudentQuestions) {
          const tqId = sq.testQuestion?.id
          if (tqId) {
            if (!questionsByTestQuestionId.has(tqId)) {
              questionsByTestQuestionId.set(tqId, [])
            }
            questionsByTestQuestionId.get(tqId).push(sq)
          }
        }

        // Processar testQuestions
        const testQuestions = bim.testQuestions?.map(tQ => {
          if (!tQ.active) {
            return { ...tQ, counter: 0, counterPercentage: 0, percentage: 0 }
          }

          const studentQuestions = questionsByTestQuestionId.get(tQ.id) || []

          // Contar respostas corretas
          const counter = studentQuestions.reduce((acc: any, sQ: any) => {
            const isCorrect = tQ.answer?.includes(sQ.answer.toUpperCase())
            return acc + (isCorrect ? 1 : 0)
          }, 0)

          const percentage = studentClassroomsBi.length > 0
            ? Math.floor((counter / studentClassroomsBi.length) * 10000) / 100
            : 0

          return {
            ...tQ,
            counter,
            counterPercentage: studentClassroomsBi.length,
            percentage
          }
        })

        // Processar levels com cache
        const alphabeticByLevel = new Map()
        for (const alpha of allAlphabetic) {
          if (alpha.rClassroom?.id === c.id &&
            alpha.test?.period?.bimester?.id === bim.id &&
            alpha.alphabeticLevel?.id) {
            const lvId = alpha.alphabeticLevel.id
            alphabeticByLevel.set(lvId, (alphabeticByLevel.get(lvId) || 0) + 1)
          }
        }

        const levels = bim.levels.map(lv => {
          const levelCounter = alphabeticByLevel.get(lv.id) || 0
          bimesterCounter += levelCounter
          return { ...lv, levelCounter }
        })

        // Calcular porcentagens após ter o total
        const levelsWithPercentage = levels.map((el: any) => ({
          ...el,
          levelPercentage: bimesterCounter > 0
            ? Math.floor((el.levelCounter / bimesterCounter) * 10000) / 100
            : 0
        }))

        return {
          ...bim,
          bimesterCounter,
          testQuestions,
          levels: levelsWithPercentage
        }
      })

      return {
        id: c.id,
        name: c.name,
        shortName: c.shortName,
        school: c.school,
        totals
      }
    })
  }

  aggregateResult(aggregatedObjet: CityHall, allClassrooms: AllClassrooms[]) {
    return aggregatedObjet.totals.map(bi => {

      const biTotals = allClassrooms.flatMap(el => el.totals.filter(total => total.id === bi.id))
      const allBi = biTotals.flatMap(el => el.bimesterCounter).reduce((acc , prev) => { acc += (prev ?? 0); return acc }, 0)
      const allTq = biTotals.flatMap(el => el.testQuestions)
      const allLv = biTotals.flatMap(el => el.levels)

      return {
        ...bi,
        bimesterCounter: allBi,
        testQuestions: bi.testQuestions?.map((el: any) => {
          const counter = allTq.filter((tQ: any) => tQ?.id === el.id).reduce((acc: any, prev: any) => { acc += (prev?.counter ?? 0); return acc }, 0)
          const counterPercentage = allTq.filter((tQ: any) => tQ?.id === el.id).reduce((acc: any, prev: any) => { acc += (prev?.counterPercentage ?? 0); return acc }, 0)
          return { ...el, counter, counterPercentage, percentage: counter > 0 ? Math.floor((counter / counterPercentage) * 10000) / 100: 0 }
        }),
        levels: bi.levels.map((el: any) => {
          const levelCounter = allLv.filter((lv: any) => lv.id === el.id).reduce((acc: any, prev: any) => { acc += (prev.levelCounter ?? 0); return acc }, 0)
          return { ...el,  levelCounter, levelPercentage: allBi > 0 ? Math.floor((levelCounter / allBi) * 10000) / 100 : 0 }
        })
      }
    })
  }

  readingFluencyHeaders(preHeaders: qReadingFluenciesHeaders[]) {
    return preHeaders.reduce((acc: ReadingHeaders[], prev) => {
      let exam = acc.find(el => el.exam_id === prev.readingFluencyExamId);
      if (!exam) {
        exam = {
          exam_id: prev.readingFluencyExamId,
          exam_name: prev.readingFluencyExamName,
          exam_color: prev.readingFluencyExamColor,
          exam_levels: []
        };
        acc.push(exam);
      }
      exam.exam_levels.push({
        level_id: prev.readingFluencyLevelId,
        level_name: prev.readingFluencyLevelName,
        level_color: prev.readingFluencyLevelColor
      });
      return acc;
    }, []);
  }

  cityHallResponse(baseClassroom: Classroom, allClasses: Classroom[]){
    const classroomNumber = baseClassroom.shortName.replace(/\D/g, "");
    const filteredClasses: Classroom[] = allClasses.filter(el => el.school.id === baseClassroom.school.id && el.shortName.replace(/\D/g, "") === classroomNumber)
    const cityHall: Classroom = { id: 999, name: 'ITATIBA', shortName: 'ITA', school: { id: 99, name: 'ITATIBA', shortName: 'ITA', inep: null, active: true }, studentClassrooms: allClasses.flatMap(cl => cl.studentClassrooms)} as unknown as Classroom
    return [ ...filteredClasses, cityHall ]
  }

  readingFluencyTotalizator(headers: qReadingFluenciesHeaders[], classroom: Classroom){

    let totalNuColumn: any[] = []
    const percentColumn = headers.reduce((acc, prev) => { const key = prev.readingFluencyExamId; if(!acc[key]) { acc[key] = 0 } return acc }, {} as any)

    for(let header of headers) {

      const el = classroom.studentClassrooms.flatMap(studentClassroom => studentClassroom.student.readingFluency.filter(readingFluency => readingFluency.rClassroom?.id === studentClassroom.classroom.id && readingFluency.readingFluencyExam.id === header.readingFluencyExamId && readingFluency.readingFluencyLevel?.id === header.readingFluencyLevelId))

      const value = el.length ?? 0
      totalNuColumn.push({ total: value, divideByExamId: header.readingFluencyExamId })
      percentColumn[header.readingFluencyExamId] += value
    }

    return totalNuColumn.map((el: any) => Math.floor((el.total / percentColumn[el.divideByExamId]) * 10000) / 100)
  }

  diffs = (original: any, current: any): boolean => {
    if(!original || !current) return false;
    if (original === current) return false;
    if (typeof original !== 'object' || original === null || current === null) return original !== current;
    const originalKeys = Object.keys(original);
    const currentKeys = Object.keys(current);
    if (originalKeys.length !== currentKeys.length) return true;
    for (let key of originalKeys) { if (!currentKeys.includes(key)) return true; if (this.diffs(original[key], current[key])) { return true } }
    return false;
  }
}

export const testController = new TestController();

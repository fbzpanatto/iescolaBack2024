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
import { Descriptor } from "../model/Descriptor";
import { Topic } from "../model/Topic";
import { ClassroomCategory } from "../model/ClassroomCategory";
import { Discipline } from "../model/Discipline";
import { Bimester } from "../model/Bimester";
import { TestCategory } from "../model/TestCategory";
import { ReadingFluency } from "../model/ReadingFluency";
import { TEST_CATEGORIES_IDS } from "../utils/testCategory";
import { AllClassrooms, AlphaHeaders, CityHall, insertStudentsBody, notIncludedInterface, qAlphaStuClassroomsFormated, qReadingFluenciesHeaders, qStudentClassroomFormated, qStudentsClassroomsForTest, ReadingHeaders, TestBodySave, Totals } from "../interfaces/interfaces";
import { Alphabetic } from "../model/Alphabetic";
import { School } from "../model/School";
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

            const sCs =
              await this.qAlphabeticStudentsForLink(
                sqlConn,
                Number(classroomId),
                test.createdAt,
                test.period.year.name
              )

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
          case (TEST_CATEGORIES_IDS.TEST_4_9): {

            let testQuestionsIds: number[] = []

            const qTestQuestions = await this.qTestQuestions(sqlConn, test.id) as TestQuestion[]

            testQuestionsIds = [ ...testQuestionsIds, ...qTestQuestions.map(testQuestion => testQuestion.id) ]
            const questionGroups = await this.getTestQuestionsGroups(testId, appCONN)

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

            const result = await this.stuQuestionsWithDuplicated(
              test, qTestQuestions, Number(classroomId), test.period.year.name, appCONN, isNaN(studentClassroomId) ? null : Number(studentClassroomId)
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

            let headers = await this.qAlphabeticHeaders(
              sqlConnection,
              year.name
            ) as unknown as AlphaHeaders[]

            const tests = await this.qAlphabeticTests(
              sqlConnection,
              baseTest.category.id,
              baseTest.discipline.id,
              year.name
            ) as unknown as Test[]

            let testQuestionsIds: number[] = []

            if(baseTest.category?.id != TEST_CATEGORIES_IDS.LITE_1) {
              for(let test of tests) {

                const testQuestions = await this.qTestQuestions(
                  sqlConnection,
                  test.id
                ) as unknown as TestQuestion[]

                test.testQuestions = testQuestions
                testQuestionsIds = [
                  ...testQuestionsIds,
                  ...testQuestions.map(testQuestion => testQuestion.id)
                ]
              }
            }

            headers = headers.map(bi => {
              return {
                ...bi,
                testQuestions: tests.find(t => t.period.bimester.id === bi.id)?.testQuestions
              }
            })

            const schools = await this.alphaQuestions(year.name, baseTest, testQuestionsIds, CONN)
            const onlyClasses = schools
              .flatMap(school => school.classrooms)
              .sort((a, b) => a.shortName.localeCompare(b.shortName))

            let resClassrooms;

            const cityHall = {
              id: 999,
              name: 'ITATIBA',
              shortName: 'ITA',
              school: 'ITATIBA',
              totals: headers.map(h => ({ ...h, bimesterCounter: 0 }))
            }

            let allClassrooms = this.alphabeticTotalizators(onlyClasses, headers)

            cityHall.totals = this.aggregateResult(cityHall, allClassrooms)

            resClassrooms = [ ...allClassrooms.filter(c => c.school.id === qClassroom.school.id), cityHall ]

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
          case TEST_CATEGORIES_IDS.TEST_4_9: {

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

            data = { ...test, testQuestions, questionGroups, classrooms: [...schoolResults.sort((a, b) => a.shortName.localeCompare(b.shortName)), cityHall] }
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

  async stuQuestionsWithDuplicated(test: Test, testQuestions: TestQuestion[], classroomId: number, yearName: string, CONN: EntityManager, studentClassroomId: number | null) {

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
          qb.where("studentClassroom.id = :studentClassroomId", { studentClassroomId })
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
          case TEST_CATEGORIES_IDS.TEST_4_9: {
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

  async testQuestLink(withTestStatus: boolean, studentClassrooms: any[], test: Test, testQuestions: TestQuestion[], userId: number, CONN: EntityManager) {
    for(let studentClassroom of studentClassrooms) {
      if(withTestStatus){
        const options = { where: { test: { id: test.id }, studentClassroom: { id: studentClassroom.id } }}
        const stStatus = await CONN.findOne(StudentTestStatus, options)
        const el = { active: true, test, studentClassroom, observation: '', createdAt: new Date(), createdByUser: userId } as StudentTestStatus
        if(!stStatus) { await CONN.save(StudentTestStatus, el) }
      }
      for(let testQuestion of testQuestions) {
        const options = { where: { testQuestion: { id: testQuestion.id, test: { id: test.id }, question: { id: testQuestion.question.id } }, student: { id: studentClassroom.student?.id ?? studentClassroom.student_id } } }
        const sQuestion = await CONN.findOne(StudentQuestion, options) as StudentQuestion
        if(!sQuestion) { await CONN.save(StudentQuestion, { answer: '', testQuestion: testQuestion, student: { id: studentClassroom.student?.id ?? studentClassroom.student_id }, createdAt: new Date(), createdByUser: userId })}
      }
    }
  }

  async qTestQuestLink(status: boolean, arr: qStudentsClassroomsForTest[], test: Test, testQuestions: TestQuestion[], userId: number, CONN: EntityManager) {
    for(let sC of arr) {
      if(status){
        const options = { where: { test: { id: test.id }, studentClassroom: { id: sC.student_classroom_id } }}
        const stStatus = await CONN.findOne(StudentTestStatus, options)
        if(!stStatus) {
          const el = { active: true, test, studentClassroom: { id: sC.student_classroom_id }, observation: '', createdAt: new Date(), createdByUser: userId } as StudentTestStatus
          await CONN.save(StudentTestStatus, el)
        }
      }
      for(let testQuestion of testQuestions) {
        const options = { where: { testQuestion: { id: testQuestion.id, test: { id: test.id }, question: { id: testQuestion.question.id } }, student: { id: sC.student_id } } }
        const sQuestion = await CONN.findOne(StudentQuestion, options) as StudentQuestion
        if(!sQuestion) { await CONN.save(StudentQuestion, { answer: '', testQuestion: testQuestion, student: { id: sC.student_id }, createdAt: new Date(), createdByUser: userId })}
      }
    }
  }

  async deleteStudentFromTest(req: Request) {

    let sqlConnection = await dbConn()

    try {

      const { classroom, studentClassroomId } = req.params

      await this.qDeleteStudentFromTest(sqlConnection, Number(classroom), Number(studentClassroomId))

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
          case (TEST_CATEGORIES_IDS.TEST_4_9): {
            const stClassrooms = await this.qNotTestIncluded(sqlConnection, String(body.year), body.classroom.id, test.id )

            if(!stClassrooms || stClassrooms.length < 1) return { status: 404, message: "Alunos não encontrados." }
            const filteredSC = stClassrooms.filter(el => body.studentClassrooms.includes(el.id)) as unknown as StudentClassroom[]
            const testQuestions = await this.getTestQuestions(test.id, CONN)
            await this.testQuestLink(true, filteredSC, test, testQuestions, qUserTeacher.person.user.id, CONN)
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
            if(bimesterId) {
              qb.andWhere("bimester.id = :bimesterId", { bimesterId })
            }
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

    const classesIds = body.classroom.map((classroom: { id: number }) => classroom.id)

    let sqlConnection = await dbConn()

    try {
      return await AppDataSource.transaction(async (CONN) => {

        const qUserTeacher = await this.qTeacherByUser(sqlConnection, body.user.user)

        if([pc.MONI, pc.SECR].includes(qUserTeacher.person.category.id)) {
          return { status: 403, message: 'Você não tem permissão para criar uma avaliação.' }
        }

        if(!qUserTeacher) return { status: 404, message: "Usuário inexistente" }

        const checkYear = await CONN.findOne(Year, { where: { id: body.year.id } })

        if(!checkYear) return { status: 404, message: "Ano não encontrado" }

        if(!checkYear.active) return { status: 400, message: "Não é possível criar um teste para um ano letivo inativo." }

        const period = await CONN.findOne(Period, { relations: ["year", "bimester"], where: { year: body.year, bimester: body.bimester } })

        if(!period) return { status: 404, message: "Período não encontrado" }

        if([TEST_CATEGORIES_IDS.LITE_1, TEST_CATEGORIES_IDS.LITE_2, TEST_CATEGORIES_IDS.LITE_3].includes(body.category.id)) {

          const test = await CONN.findOne(Test, { where: { category: body.category, discipline: body.discipline, period: period } })

          if(test) { return { status: 409, message: `Já existe uma avaliação criada com a categoria, disciplina e período informados.` } }

        }

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

        const test = new Test()
        test.name = body.name
        test.category = body.category as TestCategory
        test.discipline = body.discipline as Discipline
        test.person = qUserTeacher.person as Person
        test.period = period
        test.classrooms = classes.map(el => ({ id: el.id })) as Classroom[]
        test.createdAt = new Date()
        test.createdByUser = qUserTeacher.person.user.id

        await CONN.save(Test, test);

        const haveQuestions = [TEST_CATEGORIES_IDS.LITE_2, TEST_CATEGORIES_IDS.LITE_3, TEST_CATEGORIES_IDS.TEST_4_9, TEST_CATEGORIES_IDS.AVL_ITA]

        if(haveQuestions.includes(body.category.id)) {

          const tQts = body.testQuestions!.map((el: any) => {
            return {
              ...el,
              createdAt: new Date(),
              createdByUser: qUserTeacher.person.user.id,
              question: { ...el.question, person: el.question.person || qUserTeacher.person, createdAt: new Date(), createdByUser: qUserTeacher.person.user.id },
              test: test
            }
          })

          await CONN.save(TestQuestion, tQts)
        }

        return { status: 201, data: test }
      })
    }
    catch (error: any) { return { status: 500, message: error.message } }
    finally { if(sqlConnection) { sqlConnection.release() } }
  }

  async updateTest(id: number | string, req: Request) {

    let sqlConnection = await dbConn()

    try {
      return await AppDataSource.transaction(async (CONN) => {
        const qUserTeacher = await this.qTeacherByUser(sqlConnection, req.body.user.user)

        const userId = qUserTeacher.person.user.id
        const masterUser = qUserTeacher.person.category.id === pc.ADMN || qUserTeacher.person.category.id === pc.SUPE || qUserTeacher.person.category.id === pc.FORM;
        const test = await CONN.findOne(Test, { relations: ["person"], where: { id: Number(id) } })
        if(!test) return { status: 404, message: "Teste não encontrado" }
        if(qUserTeacher.person.id !== test.person.id && !masterUser) return { status: 403, message: "Você não tem permissão para editar esse teste." }

        test.name = req.body.name
        test.active = req.body.active
        test.updatedAt = new Date()
        test.updatedByUser = userId
        await CONN.save(Test, test)

        if(req.body.testQuestions.length){
          const bodyTq = req.body.testQuestions as TestQuestion[]
          const dataTq = await this.getTestQuestions(test.id, CONN)
          for (let next of bodyTq) {
            const curr = dataTq.find(el => el.id === next.id);
            if (!curr) { await CONN.save(TestQuestion, { ...next, createdAt: new Date(), createdByUser: userId, question: { ...next.question, person: next.question.person || qUserTeacher.person, createdAt: new Date(), createdByUser: userId, }, test }) }
            else {
              const testQuestionCondition = this.diffs(curr, next);
              if (testQuestionCondition) { await CONN.save(TestQuestion, { ...next, createdAt: curr.createdAt, createdByUser: curr.createdByUser, updatedAt: new Date(), updatedByUser: userId }) }
              if (this.diffs(curr.question, next.question)) { await CONN.save(Question, {...next.question,createdAt: curr.question.createdAt,createdByUser: curr.question.createdByUser, updatedAt: new Date(), updatedByUser: userId })}
              if (this.diffs(curr.question.descriptor, next.question.descriptor)) { await CONN.save(Descriptor, { ...next.question.descriptor, createdAt: curr.question.descriptor.createdAt, createdByUser: curr.question.descriptor.createdByUser, updatedAt: new Date(), updatedByUser: userId })}
              if (this.diffs(curr.question.descriptor.topic, next.question.descriptor.topic)) { await CONN.save(Topic, { ...next.question.descriptor.topic, createdAt: curr.question.descriptor.topic.createdAt, createdByUser: curr.question.descriptor.topic.createdByUser, updatedAt: new Date(), updatedByUser: userId })}
              if (this.diffs(curr.question.skill, next.question.skill)) { await CONN.save(Skill, { ...next.question.skill, createdAt: curr.question.skill.createdAt, createdByUser: curr.question.skill.createdByUser, updatedAt: new Date(), updatedByUser: userId })}
              if (this.diffs(curr.question.descriptor.topic.classroomCategory, next.question.descriptor.topic.classroomCategory)) { await CONN.save(ClassroomCategory, { ...next.question.descriptor.topic.classroomCategory, createdAt: curr.question.descriptor.topic.classroomCategory.createdAt, createdByUser: curr.question.descriptor.topic.classroomCategory.createdByUser, updatedAt: new Date(), updatedByUser: userId })}
              if (this.diffs(curr.questionGroup, next.questionGroup)) { await CONN.save(QuestionGroup, { ...next.questionGroup, createdAt: curr.questionGroup.createdAt, createdByUser: curr.questionGroup.createdByUser, updatedAt: new Date(), updatedByUser: userId })}
            }
          }
        }
        const result = (await this.findOneById(id, req, CONN)).data
        return { status: 200, data: result };
      })
    }
    catch (error: any) { return { status: 500, message: error.message } }
    finally { if(sqlConnection) { sqlConnection.release() } }
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
    const fields = ["testQuestion.id", "testQuestion.order", "testQuestion.answer", "testQuestion.active", "question.id", "question.title", "person.id", "question.person", "skill.id", "skill.reference", "skill.description",  "descriptor.id", "descriptor.code", "descriptor.name", "topic.id", "topic.name", "topic.description", "classroomCategory.id", "classroomCategory.name", "questionGroup.id", "questionGroup.name"]
    return await CONN.getRepository(TestQuestion)
      .createQueryBuilder("testQuestion")
      .select(selectFields ?? fields)
      .leftJoin("testQuestion.question", "question")
      .leftJoin("question.person", "person")
      .leftJoin("question.descriptor", "descriptor")
      .leftJoin("question.skill", "skill")
      .leftJoin("descriptor.topic", "topic")
      .leftJoin("topic.classroomCategory", "classroomCategory")
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

    const response = await this.qCreateLinkAlphabetic(sC, test, userId, sqlConn)

    const qTests = await this.qAlphabeticTests(sqlConn, test.category.id, test.discipline.id, test.period.year.name) as unknown as Test[]

    let headers = aHeaders.map(bi => {

      const test = qTests.find(test => test.period.bimester.id === bi.id)

      return {...bi, currTest: { id: test?.id, active: test?.active }}
    })

    let preResultScWd = await this.qAlphaStudents(sqlConn, test, classId, test.period.year.id, studentClassroomId)

    let preResultSc = await this.qStudentDisabilities(sqlConn, preResultScWd) as unknown as StudentClassroom[]

    if(questions) {

      let testQuestionsIds: number[] = []

      for(let test of qTests) {

        const testQuestions = await this.qTestQuestions(sqlConn, test.id) as unknown as TestQuestion[]

        test.testQuestions = testQuestions

        testQuestionsIds = [
          ...testQuestionsIds,
          ...testQuestions.map(testQuestion => testQuestion.id)
        ]

        await this.testQuestLink(false, preResultSc, test, testQuestions, userId, CONN)
      }

      headers = headers.map(bi => { return { ...bi, testQuestions: qTests.find(test => test.period.bimester.id === bi.id)?.testQuestions } })

      // TODO: implement studentClassroomId filter here
      const currentResult = await this.alphaQuestions(test.period.year.name, test, testQuestionsIds, CONN, classId, studentClassroomId)
      preResultSc = currentResult.flatMap(school => school.classrooms.flatMap(classroom => classroom.studentClassrooms))
    }

    let studentClassrooms = preResultSc.map(el => ({ ...el, studentRowTotal: el.student.alphabetic.reduce((acc, curr) => acc + (curr.alphabeticLevel?.id ? 1 : 0), 0) }))

    const studentCount = studentClassrooms.reduce((acc, item) => { acc[item.student.id] = (acc[item.student.id] || 0) + 1; return acc }, {} as Record<number, number>);

    const duplicatedStudents = studentClassrooms.filter(item => studentCount[item.student.id] > 1).map(d => d.endedAt ? { ...d, ignore: true } : d)

    studentClassrooms = studentClassrooms.map(item => {
      const duplicated = duplicatedStudents.find(d => d.id === item.id);
      const newItem = duplicated ? { ...duplicated } : { ...item };

      newItem.student.alphabetic = newItem.student.alphabetic.map(alpha => {
        if(item.endedAt && alpha.rClassroom?.id && alpha.rClassroom.id != room.id) { return { ...alpha, gray: true } }

        if(!item.endedAt && alpha.rClassroom?.id && alpha.rClassroom.id != room.id) { return { ...alpha, gray: true } }

        if(alpha.rClassroom?.id && alpha.rClassroom.id != room.id) { return { ...alpha, gray: true } }
        return alpha
      })

      newItem.student.studentQuestions = newItem.student.studentQuestions?.map(sQ => {

        if(item.endedAt && sQ.rClassroom?.id && sQ.rClassroom.id != room.id) { return { ...sQ, answer: 'TR' } }

        if(!item.endedAt && sQ.rClassroom?.id && sQ.rClassroom.id != room.id) { return { ...sQ, answer: 'OE' } }

        if(sQ.rClassroom?.id && sQ.rClassroom.id != room.id) { return { ...sQ, answer: '-' } }

        return { ...sQ }
      })

      return newItem;
    });

    const allAlphabetic = studentClassrooms.filter((el: any) => !el.ignore).flatMap(el => el.student.alphabetic)

    for(let el of studentClassrooms.flatMap(sc => sc.student.studentDisabilities)) {
      el.disability = await CONN.findOne(Disability, { where: { studentDisabilities: el } }) as Disability
    }

    headers = headers.map(bim => {

      let bimesterCounter = 0;

      const studentClassroomsBi = studentClassrooms
        .filter((el: any) => !el.ignore)
        .filter(sc => sc.student.studentQuestions?.some(sq => (sq.rClassroom?.id === room.id) && (sq.testQuestion.test.period.bimester.id === bim.id) && (sq.answer && sq.answer != 'null' && sq.answer.length > 0 && sq.answer != '' && sq.answer != ' ')))

      const allStudentQuestions = studentClassroomsBi.flatMap(sc => sc.student.studentQuestions )
      const testQuestions = bim.testQuestions?.map(tQ => {

        // let aux = 0;

        if(!tQ.active) { return { ...tQ, counter: 0, counterPercentage: 0 } }

        const studentQuestions = allStudentQuestions.filter(sQ => { return sQ.testQuestion?.id === tQ?.id })

        const counter = studentQuestions.reduce((acc, sQ) => {

          // if((sQ.answer.length < 1) && (sQ.answer === '' || sQ.answer === ' ')) {
          //   aux += 1
          //   return acc
          // }

          if(sQ.rClassroom?.id != classId){ return acc }

          if (sQ.rClassroom?.id === classId && (sQ.answer && sQ.answer != 'null' && sQ.answer.length > 0 && sQ.answer != '' && sQ.answer != ' ') && tQ.answer?.includes(sQ.answer.toUpperCase())) { return acc + 1 } return acc
        }, 0)

        // return { ...tQ, counter, counterPercentage: studentClassroomsBi.length > 0 ? Math.floor((counter / (studentClassroomsBi.length - aux)) * 10000) / 100 : 0 }
        return { ...tQ, counter, counterPercentage: studentClassroomsBi.length > 0 ? Math.floor((counter / studentClassroomsBi.length) * 10000) / 100 : 0 }
      })

      const levels = bim.levels.map(level => {
        const levelCounter = allAlphabetic.reduce((acc, prev) => {
          return acc + (prev.rClassroom?.id === classId && prev.test.period.bimester.id === bim.id && prev.alphabeticLevel?.id === level.id ? 1 : 0);
        }, 0)

        bimesterCounter += levelCounter
        return { ...level, levelCounter }
      })

      return { ...bim, bimesterCounter, testQuestions,
        levels: levels.map(level => ({ ...level, levelPercentage: bimesterCounter > 0 ? Math.floor((level.levelCounter / bimesterCounter) * 10000) / 100 : 0}))
      }
    })

    // TODO: remove this on 2026
    studentClassrooms = studentClassrooms
      .sort((a, b) => a.student.person.name.localeCompare(b.student.person.name))
      .sort((a, b) => a.rosterNumber - b.rosterNumber)

    return { test, studentClassrooms, classroom: room, alphabeticHeaders: headers }
  }

  async alphaQuestions(yearName: string, test: any, testQuestionsIds: number[], CONN: EntityManager, classroomId?: number, studentClassroomId?: number | null) {

    const hasQuestions = !!testQuestionsIds.length

    const query = CONN.getRepository(School)
      .createQueryBuilder("school")
      .leftJoinAndSelect('school.classrooms', 'classrooms')
      .leftJoinAndSelect('classrooms.school', 'schoolClassrooms')
      .leftJoin('classrooms.studentClassrooms', 'studentClassroom')
      .addSelect(['studentClassroom.id', 'studentClassroom.rosterNumber', 'studentClassroom.endedAt'])
      .leftJoin("studentClassroom.student", "student")
      .addSelect(['student.id'])

      .leftJoinAndSelect("student.alphabeticFirst", "alphabeticFirst")
      .leftJoinAndSelect("alphabeticFirst.alphabeticFirst", "alphabeticFirstStudentLevel")

      .leftJoinAndSelect("student.alphabetic", "alphabetic")
      .leftJoinAndSelect("alphabetic.rClassroom", "alphabeticRClassroom")
      .leftJoinAndSelect("alphabetic.alphabeticLevel", "alphabeticLevel")
      .leftJoin("alphabetic.test", "alphaTest")
      .addSelect(['alphaTest.id', 'alphaTest.name'])
      .leftJoin("alphaTest.category", "alphaTestCategory")
      .leftJoin("alphaTest.discipline", "alphaTestDiscipline")
      .leftJoinAndSelect("alphaTest.period", "alphaTestPeriod")
      .leftJoinAndSelect("alphaTestPeriod.bimester", "alphaTestBimester")
      .leftJoin("alphaTestPeriod.year", "alphaTestYear")
      .addSelect(['alphaTestYear.id', 'alphaTestYear.name'])

      .leftJoin("studentClassroom.year", "studentClassroomYear")
      .leftJoin("student.person", "person")
      .addSelect(['person.id', 'person.name'])
      .leftJoinAndSelect("studentClassroom.classroom", "classroom")
      .leftJoinAndSelect("student.studentDisabilities", "studentDisabilities", "studentDisabilities.endedAt IS NULL")

      .where(new Brackets(qb => {
        if(hasQuestions){
          qb.where("studentClassroom.startedAt < :testCreatedAt", { testCreatedAt: test.createdAt })
            .orWhere("alphabetic.id IS NOT NULL")
            .orWhere("studentQuestion.id IS NOT NULL")
        } else {
          qb.where("studentClassroom.startedAt < :testCreatedAt", { testCreatedAt: test.createdAt })
            .orWhere("alphabetic.id IS NOT NULL")
        }
      }))

      .andWhere("school.id NOT IN (:...schoolsIds)", { schoolsIds: [28, 29] })
      .andWhere("classrooms.id NOT IN (:...classroomsIds)", { classroomsIds: [1216,1217,1218] })
      .andWhere("alphaTestDiscipline.id = :alphaTestDiscipline", { alphaTestDiscipline: test.discipline?.id ?? test.discipline_id })
      .andWhere("alphaTestCategory.id = :testCategory", { testCategory: test.category?.id ?? test.test_category_id })
      .andWhere("alphaTestYear.name = :yearName", { yearName })
      .andWhere("studentClassroomYear.name = :yearName", { yearName })
      .addOrderBy("studentClassroom.rosterNumber", "ASC")
      .addOrderBy('classroom.shortName', 'ASC')
      .addOrderBy('school.shortName', 'ASC')

    if(hasQuestions) {
      query
        .leftJoinAndSelect("student.studentQuestions", "studentQuestion")
        .leftJoin("studentQuestion.rClassroom", "studentQuestionRClassroom")
        .addSelect(['studentQuestionRClassroom.id'])
        .leftJoin("studentQuestion.testQuestion", "testQuestion", "testQuestion.id IN (:...testQuestions)", { testQuestions: testQuestionsIds })
        .addSelect(['testQuestion.id', 'testQuestion.order', 'testQuestion.answer', 'testQuestion.active'])
        .leftJoin("testQuestion.questionGroup", "questionGroup")

        .leftJoin("testQuestion.test", "test")
        .addSelect(['test.id', 'test.name'])
        .leftJoin("test.category", "testCategory")
        .leftJoin("test.discipline", "testDiscipline")
        .leftJoinAndSelect("test.period", "period")
        .leftJoinAndSelect("period.bimester", "bimester")
        .addOrderBy("bimester.id", "ASC")
        .addOrderBy("testQuestion.order", "ASC")
        .leftJoin("period.year", "pYear")
        .addSelect(['pYear.id', 'pYear.name'])

        .andWhere("testCategory.id = :testCategory", { testCategory: test.category?.id ?? test.test_category_id })
        .andWhere("testDiscipline.id = :testDiscipline", { testDiscipline: test.discipline?.id ?? test.discipline_id })
        .andWhere("pYear.name = :yearName", { yearName })
    }

    if (classroomId) { query.andWhere("studentClassroom.classroom = :classroomId", { classroomId }) }
    if (studentClassroomId) { query.andWhere("studentClassroom.id = :studentClassroomId", { studentClassroomId }) }

    return await query.getMany();
  }

  duplicatedStudents(studentClassrooms: StudentClassroom[] | qStudentClassroomFormated[]): any {
    const count = studentClassrooms.reduce((acc, item) => { acc[item.student.id] = (acc[item.student.id] || 0) + 1; return acc }, {} as Record<number, number>);
    const duplicatedStudents = studentClassrooms.filter(item => count[item.student.id] > 1).map(d => d.endedAt ? { ...d, ignore: true } : d)
    return studentClassrooms.map(item => { const duplicated = duplicatedStudents.find(d => d.id === item.id); return duplicated ? duplicated : item });
  }

  alphabeticTotalizators(onlyClasses: Classroom[], headers: AlphaHeaders[]) {
    return onlyClasses.map(c => {

      let studentClassrooms = c.studentClassrooms.map(el =>
        ({ ...el, studentRowTotal: el.student.alphabetic.reduce((acc, curr) => acc + (curr.alphabeticLevel?.id ? 1 : 0), 0) })
      )

      studentClassrooms = this.duplicatedStudents(studentClassrooms)

      const allAlphabetic = studentClassrooms.filter((el: any) => !el.ignore).flatMap(el => el.student.alphabetic)

      const totals = headers.map(bim => {

        let bimesterCounter = 0;

        const studentClassroomsBi = studentClassrooms
          .filter((el: any) => !el.ignore)
          .filter(sc => sc.student.studentQuestions?.some(sq => (sq.rClassroom?.id === c.id) && (sq.testQuestion.test.period.bimester.id === bim.id) && (sq.answer && sq.answer != 'null' && sq.answer.length > 0 && sq.answer != '' && sq.answer != ' ')))

        const allStudentQuestions = studentClassroomsBi
          .flatMap(sc => sc.student.studentQuestions )

        const testQuestions = bim.testQuestions?.map(tQ => {

          if(!tQ.active) { return { ...tQ, counter: 0, counterPercentage: 0 } }

          const studentQuestions = allStudentQuestions.filter(sQ => { return sQ.testQuestion?.id === tQ?.id })

          const counter = studentQuestions.reduce((acc, sQ) => {

            if(sQ.rClassroom?.id != c.id){ return acc }

            if (sQ.rClassroom?.id === c.id && (sQ.answer && sQ.answer != 'null' && sQ.answer.length > 0 && sQ.answer != '' && sQ.answer != ' ') && tQ.answer?.includes(sQ.answer.toUpperCase())) { return acc + 1 } return acc
          }, 0)

          return { ...tQ, counter, counterPercentage: studentClassroomsBi.length, percentage: counter > 0 ? Math.floor((counter / studentClassroomsBi.length) * 10000) / 100: 0 }
        })

        const levels = bim.levels.map(lv => {

          const levelCounter = allAlphabetic.reduce((acc, prev) => {
            return acc + (prev.rClassroom?.id === c.id && prev.test.period.bimester.id === bim.id && prev.alphabeticLevel?.id === lv.id ? 1 : 0);
          }, 0)

          bimesterCounter += levelCounter
          return { ...lv, levelCounter }
        })

        return {
          ...bim,
          bimesterCounter,
          testQuestions: testQuestions,
          levels: levels.map((el: any) => ({ ...el, levelPercentage: bimesterCounter > 0 ? Math.floor((el.levelCounter / bimesterCounter) * 10000) / 100 : 0 }))
        }
      })

      return { id: c.id, name: c.name, shortName: c.shortName, school: c.school, totals }
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

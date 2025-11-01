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
import { PERSON_CATEGORIES } from "../utils/enums";
import { Year } from "../model/Year";
import { EntityManager, EntityTarget } from "typeorm";
import { Question } from "../model/Question";
import { Discipline } from "../model/Discipline";
import { Bimester } from "../model/Bimester";
import { TestCategory } from "../model/TestCategory";
import { ReadingFluency } from "../model/ReadingFluency";
import { TEST_CATEGORIES_IDS } from "../utils/enums";
import { AllClassrooms, AlphaHeaders, CityHall, insertStudentsBody, notIncludedInterface, qReadingFluenciesHeaders, TestBodySave, Totals } from "../interfaces/interfaces";
import { Alphabetic } from "../model/Alphabetic";
import { Person } from "../model/Person";
import { Skill } from "../model/Skill";
import { Helper } from "../utils/helpers";

class TestController extends GenericController<EntityTarget<Test>> {

  constructor() { super(Test) }

  async getStudents(req?: Request) {

    const testId = Number(req?.params.id)
    const classroomId = Number(req?.params.classroom);
    const scId = Number(req?.query.stc);
    const isHistory = Boolean(req?.query.isHistory);

    try {

      const testClassroom = await this.qTestClassroom(testId, classroomId)
      if(!testClassroom) { return { status: 404, message: 'Esse teste não existe para a sala em questão.' } }

      const tUser = await this.qUser(req?.body.user.user)
      const masterUser = tUser?.categoryId === PERSON_CATEGORIES.ADMN || tUser?.categoryId === PERSON_CATEGORIES.SUPE || tUser?.categoryId === PERSON_CATEGORIES.FORM;

      const { classrooms } = await this.qTeacherClassrooms(Number(req?.body.user.user))
      if(!classrooms?.includes(classroomId) && !masterUser && !isHistory) { return { status: 403, message: "Você não tem permissão para acessar essa sala." } }

      const qTest = await this.qTestByIdAndYear(testId, String(req?.params.year))
      if(!qTest) return { status: 404, message: "Teste não encontrado" }
      const test = Helper.testFormater(qTest)

      const classroom = await this.qClassroom(classroomId)
      if(!classroom) return { status: 404, message: "Sala não encontrada" }

      let data: any = {}

      if([TEST_CATEGORIES_IDS.LITE_1, TEST_CATEGORIES_IDS.LITE_2, TEST_CATEGORIES_IDS.LITE_3].includes(test.category.id)) {
        const headers = await this.qAlphabeticHeaders(test.period.year.name) as unknown as AlphaHeaders[]
        data = await this.alphabeticTest(headers, test, classroom, classroomId, tUser?.userId as number, isNaN(scId) ? null : Number(scId))
        return { status: 200, data: data };
      }

      if([TEST_CATEGORIES_IDS.AVL_ITA, TEST_CATEGORIES_IDS.SIM_ITA].includes(test.category.id)) {

        await this.handleDuplicateStudentTestStatusForQuestions(testId, classroomId, test.period.year.name, tUser?.userId as number);

        const qTestQuestions = await this.qTestQuestions(test.id) as TestQuestion[]

        const questionGroups = await this.qTestQuestionsGroupsOnReport(testId)

        let classroomPoints = 0
        let classroomPercent = 0
        let validStudentsTotalizator = 0
        let totals: Totals[] = qTestQuestions.map(el => ({ id: el.id, tNumber: 0, tTotal: 0, tRate: 0 }))
        let answersLetters: { letter: string, questions: {  id: number, order: number, occurrences: number, percentage: number }[] }[] = []

        const qStudentsClassroom = await this.qStudentClassroomsForTest(test, classroomId, test.period.year.name, isNaN(scId) ? null : Number(scId))

        await this.unifiedTestQuestLinkSql(true, qStudentsClassroom, test, qTestQuestions, tUser?.userId as number)

        let diffOe = 0
        let validSc = 0

        let result = await this.getStudentsQuestionsSql(test, qTestQuestions, Number(classroomId), test.period.year.name, isNaN(scId) ? null : Number(scId)) as any[]

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

        return { status: 200, data: data };
      }

      if([TEST_CATEGORIES_IDS.READ_2, TEST_CATEGORIES_IDS.READ_3].includes(test.category.id)) {

        await this.cleanupOrphanedReadingFluencyRecords(testId, classroomId, test.period.year.name);

        const headers = await this.qReadingFluencyHeaders()
        const fluencyHeaders = Helper.readingFluencyHeaders(headers)

        const preStudents = await this.stuClassReadFSql(test, Number(classroomId), test.period.year.name, isNaN(scId) ? null : Number(scId))

        const linking = await this.linkReadingSql(headers, preStudents, test, tUser?.userId as number, classroomId, test.period.year.name)

        let studentClassrooms = await this.getReadingFluencyStudentsSql(test, classroomId, test.period.year.name, isNaN(scId) ? null : Number(scId))

        studentClassrooms = await this.qStudentDisabilities(studentClassrooms) as unknown as StudentClassroom[]

        studentClassrooms = studentClassrooms.map((item: any) => {

          item.student.readingFluency = item.student.readingFluency.map((rF: ReadingFluency) => {
            if(item.endedAt && rF.rClassroom?.id && rF.rClassroom.id != classroomId) { return { ...rF, gray: true } }

            if(!item.endedAt && rF.rClassroom?.id && rF.rClassroom.id != classroomId) { return { ...rF, gray: true } }

            if(rF.rClassroom?.id && rF.rClassroom.id != classroomId) { return { ...rF, gray: true } }
            return rF
          })

          return item
        })

        const totalNuColumn = []

        const allFluencies = studentClassrooms.filter((el: any) => !el.ignore).flatMap((el: any) => el.student.readingFluency)

        const percentColumn = headers.reduce((acc, prev) => { const key = prev.readingFluencyExamId; if(!acc[key]) { acc[key] = 0 } return acc }, {} as any)

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

        return { status: 200, data: data };
      }

      return { status: 200, data };
    }
    catch (error: any) { console.log('error', error); return { status: 500, message: error.message } }
  }

  async getFormData(req: Request) {
    try {
      return await AppDataSource.transaction(async (CONN) => {
        let classrooms = (await classroomController.getAllClassrooms(req)).data

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

    try {

      const year = await this.qYearByName(String(req.query?.year))
      if(!year) return { status: 404, message: "Ano não encontrado." }

      const qUt = await this.qTeacherByUser(req.body.user.user)

      const masterUser = qUt.person.category.id === PERSON_CATEGORIES.ADMN || qUt.person.category.id === PERSON_CATEGORIES.SUPE || qUt.person.category.id === PERSON_CATEGORIES.FORM

      const baseTest = Helper.testFormater(await this.qTestByIdAndYear(Number(testId), year.name))

      const { classrooms } = await this.qTeacherClassrooms(req?.body.user.user)

      if(!classrooms.includes(Number(classroomId)) && !masterUser) { return { status: 403, message: "Você não tem permissão para acessar essa sala." } }

      const qClassroom = await this.qClassroom(Number(classroomId))
      if (!qClassroom) return { status: 404, message: "Sala não encontrada" }

      const serieFilter = `${Number(qClassroom.shortName.replace(/\D/g, ""))}%`;

      if([TEST_CATEGORIES_IDS.LITE_1, TEST_CATEGORIES_IDS.LITE_2, TEST_CATEGORIES_IDS.LITE_3].includes(baseTest.category.id)) {

        const [preheaders, tests] = await Promise.all([
          this.qAlphabeticHeaders(year.name) as Promise<any[]>,
          this.qAlphabeticTests(baseTest.category.id, baseTest.discipline.id, year.name) as Promise<any[]>
        ])

        let testQuestionsIds: number[] = []

        if(baseTest.category?.id != TEST_CATEGORIES_IDS.LITE_1 && tests.length > 0) {
          const testQuestionsArr = await Promise.all(tests.map(test => this.qTestQuestions(test.id)))

          for(let i = 0; i < tests.length; i++) { tests[i].testQuestions = testQuestionsArr[i]; testQuestionsIds.push(...tests[i].testQuestions.map((tq: any) => tq.id)) }
        }

        const testsByBimesterId = new Map()
        for(const test of tests) { const bimesterId = test.period?.bimester?.id; if(bimesterId) { testsByBimesterId.set(bimesterId, test) } }

        let headers = preheaders.map((bi: any) => { return { ...bi, testQuestions: testsByBimesterId.get(bi.id)?.testQuestions || [] } })

        const schools = await this.alphaQuestions(serieFilter, year.name, baseTest, testQuestionsIds)
        const onlyClasses = schools
          .flatMap((school: any) => school.classrooms)
          .sort((a: any, b: any) => a.shortName.localeCompare(b.shortName))

        const cityHall = { id: 999, name: 'ITATIBA', shortName: 'ITA', school: 'ITATIBA', totals: headers.map((h: any) => ({ ...h, bimesterCounter: 0 })) }

        let allClassrooms = this.alphabeticTotalizators(onlyClasses, headers)

        cityHall.totals = this.aggregateResult(cityHall, allClassrooms)

        const schoolId = qClassroom?.school?.id
        const resClassrooms = schoolId ? [...allClassrooms.filter((c: any) => c.school?.id === schoolId), cityHall] : [cityHall]

        const test = { id: 99, name: baseTest.name, classrooms: [qClassroom], category: { id: baseTest.category.id, name: baseTest.category.name }, discipline: { name: baseTest.discipline.name }, period: { bimester: { name: 'TODOS' }, year }}

        return { status: 200, data: { alphabeticHeaders: headers, ...test, classrooms: resClassrooms } };
      }

      if([TEST_CATEGORIES_IDS.AVL_ITA, TEST_CATEGORIES_IDS.SIM_ITA].includes(baseTest.category.id)) {
        const qTestQuestions = await this.qTestQuestions(testId) as TestQuestion[];
        if (!qTestQuestions) return { status: 404, message: "Questões não encontradas" };

        const testQuestionsIds = qTestQuestions.map(tq => tq.id);
        const questionGroups = await this.qTestQuestionsGroupsOnReport(Number(testId));

        const classroomNumber = qClassroom.shortName.replace(/\D/g, "");
        const baseSchoolId = qClassroom.school.id;

        const pResult = Helper.testGraph((await this.qGraphTest(testId, testQuestionsIds, year)) as Array<any>);

        return { status: 200, data: Helper.classroomDataStructure(pResult, baseTest, questionGroups, qTestQuestions, baseSchoolId, classroomNumber) };
      }

      return await AppDataSource.transaction(async(typeOrmConnection) => {

        let data;

        switch (baseTest.category?.id) {
          case TEST_CATEGORIES_IDS.READ_2:
          case TEST_CATEGORIES_IDS.READ_3: {

            const [headers, test] = await Promise.all([
              this.qReadingFluencyHeaders(),
              this.getReadingFluencyForGraphic(testId, String(year.id), typeOrmConnection) as Promise<Test>
            ])

            const fluencyHeaders = Helper.readingFluencyHeaders(headers)

            let response = { ...test, fluencyHeaders }

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
        }
        return { status: 200, data };
      })
    }
    catch (error: any) { return { status: 500, message: error.message } }
  }

  async getAllToInsert(request: Request) {
    const testId = request?.params.id
    const classroomId = request?.params.classroom
    const yearName = request.params.year

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
          case TEST_CATEGORIES_IDS.AVL_ITA: {
            data = await this.qNotTestIncluded(yearName, Number(classroomId), test.id )
            break;
          }
        }
        return { status: 200, data };
      })
    }
    catch (error: any) { return { status: 500, message: error.message } }
  }

  async deleteStudentFromTest(req: Request) {
    const studentClassroomId = !isNaN(parseInt(req.query.studentClassroomId as string)) ? parseInt(req.query.studentClassroomId as string) : null
    const testId = !isNaN(parseInt(req.query.testId as string)) ? parseInt(req.query.testId as string) : null
    const classroomId = !isNaN(parseInt(req.params.classroom as string)) ? parseInt(req.params.classroom as string) : null

    try {

      if(studentClassroomId === null || testId === null || classroomId === null) {
        return { status: 400, message: 'Parâmetros inválidos.' }
      }

      const qUserTeacher = await this.qTeacherByUser(req.body.user.user)

      if(![PERSON_CATEGORIES.ADMN, PERSON_CATEGORIES.DIRE, PERSON_CATEGORIES.VICE, PERSON_CATEGORIES.COOR, PERSON_CATEGORIES.SECR].includes(qUserTeacher.person.category.id)) {
        return { status: 403, message: 'Você não tem permissão para acessar ou modificar este recurso.' }
      }

      const qTest = await this.qTestById(testId)

      if(!qTest.active) {
        return { status: 403, message: 'Não é permitido realizar modificações em avaliações encerradas.' }
      }

      if(studentClassroomId && testId && classroomId) {
        await this.qSetInactiveStudentTest(studentClassroomId, testId, classroomId, qUserTeacher.person.user.id)
      }

      return { status: 200, data: {} };
    }
    catch (error: any) {
      console.log('deleteStudent', error)
      return { status: 500, message: error.message }
    }
  }

  async insertStudents(req: Request) {
    const body = req.body as insertStudentsBody

    try {
      return await AppDataSource.transaction(async (CONN) => {

        const qUserTeacher = await this.qTeacherByUser(body.user.user)

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
            const headers = await this.qReadingFluencyHeaders()
            await this.linkReadingSql(headers, filteredSC, test, qUserTeacher.person.user.id, body.classroom.id,  String(body.year))
            break;
          }

          case (TEST_CATEGORIES_IDS.AVL_ITA):
          case (TEST_CATEGORIES_IDS.SIM_ITA): {
            const stClassrooms = await this.qNotTestIncluded(String(body.year), body.classroom.id, test.id )

            if(!stClassrooms || stClassrooms.length < 1) return { status: 404, message: "Alunos não encontrados." }
            const filteredSC = stClassrooms.filter(el => body.studentClassrooms.includes(el.id)) as unknown as StudentClassroom[]
            const testQuestions = await this.getTestQuestions(test.id, CONN)
            const linkResult = await this.unifiedTestQuestLinkSql(true, filteredSC, test, testQuestions, qUserTeacher.person.user.id, true)
            if(linkResult && linkResult?.length > 0) {
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
    try {
      const bimesterId = !isNaN(parseInt(req.query.bimester as string)) ? parseInt(req.query.bimester as string) : null;
      const disciplineId = !isNaN(parseInt(req.query.discipline as string)) ? parseInt(req.query.discipline as string) : null;
      const search = req.query.search as string || '';
      const limit = !isNaN(parseInt(req.query.limit as string)) ? parseInt(req.query.limit as string) : 100;
      const offset = !isNaN(parseInt(req.query.offset as string)) ? parseInt(req.query.offset as string) : 0;

      let yearName = req.params.year;

      if (yearName.length != 4) { const currentYear = await this.qCurrentYear(); yearName = currentYear.name }

      const qUserTeacher = await this.qTeacherByUser(req.body.user.user);

      const masterTeacher =
        qUserTeacher.person.category.id === PERSON_CATEGORIES.ADMN ||
        qUserTeacher.person.category.id === PERSON_CATEGORIES.SUPE ||
        qUserTeacher.person.category.id === PERSON_CATEGORIES.FORM;

      const { classrooms } = await this.qTeacherClassrooms(req?.body.user.user);
      const { disciplines } = await this.qTeacherDisciplines(req?.body.user.user);

      const testsMap = new Map<number, any>();

      const rows = await this.qfindAllByYear(
        masterTeacher,
        yearName,
        classrooms,
        disciplines,
        bimesterId,
        disciplineId,
        search,
        limit,
        offset
      )

      for (const row of rows) {
        const testId = row.test_id;

        if (!testsMap.has(testId)) {
          testsMap.set(testId, {
            id: testId,
            name: row.test_name,
            period: {
              id: row.period_id,
              year: {
                id: row.year_id,
                name: row.year_name,
                active: row.year_active
              },
              bimester: {
                id: row.bimester_id,
                name: row.bimester_name,
                testName: [TEST_CATEGORIES_IDS.LITE_1, TEST_CATEGORIES_IDS.LITE_2, TEST_CATEGORIES_IDS.LITE_3].includes(row.category_id) ? 'TODOS': row.bimester_test_name
              }
            },
            category: {
              id: row.category_id,
              name: row.category_name
            },
            discipline: {
              id: row.discipline_id,
              name: row.discipline_name
            },
            classrooms: []
          });
        }

        const test = testsMap.get(testId);

        // Adicionar classroom se ainda não existir
        const existingClassroom = test.classrooms.find((c: any) => c.id === row.classroom_id);

        if (!existingClassroom) {
          test.classrooms.push({
            id: row.classroom_id,
            name: row.classroom_name,
            shortName: row.classroom_shortName,
            school: {
              id: row.school_id,
              name: row.school_name,
              shortName: row.school_shortName
            }
          });
        }
      }

      let testClasses = Array.from(testsMap.values());

      return { status: 200, data: testClasses };
    }
    catch (error: any) { console.error('Error in findAllByYear:', error); return { status: 500, message: error.message } }
  }

  async getById(req: Request) {
    const { id } = req.params
    try {
      return await AppDataSource.transaction(async(CONN) => {
        const qUserTeacher = await this.qTeacherByUser(req.body.user.user)
        const masterUser = qUserTeacher.person.category.id === PERSON_CATEGORIES.ADMN || qUserTeacher.person.category.id === PERSON_CATEGORIES.SUPE || qUserTeacher.person.category.id === PERSON_CATEGORIES.FORM;
        const op = { relations: ["period", "period.year", "period.bimester", "discipline", "category", "person", "classrooms.school"], where: { id: parseInt(id) } }
        const test = await CONN.findOne(Test, { ...op })
        if(qUserTeacher.person.id !== test?.person.id && !masterUser) return { status: 403, message: "Você não tem permissão para editar esse teste." }
        if (!test) { return { status: 404, message: 'Data not found' } }
        const testQuestions = await this.getTestQuestions(test.id, CONN)
        return { status: 200, data: { ...test, testQuestions } };
      })
    }
    catch (error: any) { return { status: 500, message: error.message } }
  }

  async saveTest(body: TestBodySave) {
    const classesIds = body.classroom.map((classroom: { id: number }) => classroom.id);
    try {
      return await AppDataSource.transaction(async (CONN) => {
        const qUserTeacher = await this.qTeacherByUser(body.user.user);

        if([PERSON_CATEGORIES.MONI, PERSON_CATEGORIES.SECR, PERSON_CATEGORIES.PROF, PERSON_CATEGORIES.COOR, PERSON_CATEGORIES.VICE, PERSON_CATEGORIES.DIRE].includes(qUserTeacher.person.category.id)) {
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
  }

  async updateTest(id: number | string, req: Request) {
    try {
      return await AppDataSource.transaction(async (CONN) => {
        const uTeacher = await this.qTeacherByUser(req.body.user.user)
        const userId = uTeacher.person.user.id
        const masterUser = uTeacher.person.category.id === PERSON_CATEGORIES.ADMN ||
          uTeacher.person.category.id === PERSON_CATEGORIES.SUPE ||
          uTeacher.person.category.id === PERSON_CATEGORIES.FORM;

        const test = await CONN.findOne(Test, { relations: ["person", "discipline"], where: { id: Number(id) } })
        if(!test) return { status: 404, message: "Teste não encontrado" }
        if(uTeacher.person.id !== test.person.id && !masterUser)
          return { status: 403, message: "Você não tem permissão para editar esse teste." }

        // Atualiza dados básicos do teste
        test.name = req.body.name
        test.active = req.body.active
        test.hideAnswers = req.body.hideAnswers
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
                if (questionToSave.skill?.id) { questionData.skill = { id: questionToSave.skill.id } }

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
    catch (error: any) { return { status: 500, message: error.message } }
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

  async getTestForGraphic(testId: string, yearId: string, CONN: EntityManager) {

    const testQuestions = await this.qTestQuestions(testId) as TestQuestion[]

    if (!testQuestions) return { status: 404, message: "Questões não encontradas" }
    const testQuestionsIds = testQuestions.map(testQuestion => testQuestion.id)

    const test = await CONN.getRepository(Test)
      .createQueryBuilder("test")
      .select(['test.id', 'test.name', 'test.hideAnswers'])
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
          const studentClassrooms = Helper.duplicatedStudents(classroom.studentClassrooms).filter((el: any) => !el.ignore) as StudentClassroom[]
          return { ...classroom, studentClassrooms }
        })
      }
    }

    return data
  }

  async alphabeticTest(aHeaders: AlphaHeaders[], test: Test, room: Classroom, classId: number, userId: number, studentClassroomId: number | null) {

    const qTests = await this.qAlphabeticTests(test.category.id, test.discipline.id, test.period.year.name) as unknown as Test[]

    let testsMap = new Map(qTests.map(t => [t.period.bimester.id, t]));
    let headers = aHeaders.map(bi => {
      const test = testsMap.get(bi.id);
      return { ...bi, currTest: { id: test?.id, active: test?.active } };
    });

    let preResultScWd = await this.qAlphaStudents(test, classId, test.period.year.id, studentClassroomId)
    let preResultSc = await this.qStudentDisabilities(preResultScWd) as unknown as StudentClassroom[]

    const studentDisabilitiesMap = new Map<number, any[]>();

    for (const item of preResultSc) {
      if (item.student?.studentDisabilities && item.student.studentDisabilities.length > 0) {
        studentDisabilitiesMap.set(item.student.id, item.student.studentDisabilities);
      }
    }

    const allQuestionsRaw = await this.bactchQueryAlphaQuestions(qTests.map(t => t.id)) as any

    const questionsByTestId = new Map<number, any[]>();

    allQuestionsRaw.forEach((q: any) => {
      const testId = q.test_id;
      if (!questionsByTestId.has(testId)) { questionsByTestId.set(testId, []) }
      questionsByTestId.get(testId)!.push(q);
    });

    let testQuestionsIds: number[] = [];

    for (let test of qTests) {
      const rawQuestions = questionsByTestId.get(test.id) || [];
      const testQuestions = Helper.testQuestions(rawQuestions) as unknown as TestQuestion[];

      test.testQuestions = testQuestions;
      testQuestionsIds = [ ...testQuestionsIds, ...testQuestions.map(testQuestion => testQuestion.id) ];
    }

    const result = await Promise.all(qTests.map(test => this.unifiedTestQuestLinkSql(false, preResultSc, test, test.testQuestions, userId)));

    testsMap = new Map(qTests.map(t => [t.period.bimester.id, t]));

    headers = headers.map(bi => { return {...bi, testQuestions: testsMap.get(bi.id)?.testQuestions } });

    const serieFilter = `${Number(room.shortName.replace(/\D/g, ""))}%`;

    const currentResult = await this.alphaQuestions(serieFilter, test.period.year.name, test, testQuestionsIds, classId, studentClassroomId);
    preResultSc = currentResult.flatMap(school => school.classrooms.flatMap((classroom: any) => classroom.studentClassrooms));

    for (const item of preResultSc) {
      if (item.student && studentDisabilitiesMap.has(item.student.id)) { item.student.studentDisabilities = studentDisabilitiesMap.get(item.student.id) || [] }
      else { item.student.studentDisabilities = [] }
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

      studentClassrooms = Helper.duplicatedStudents(studentClassrooms)

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

  cityHallResponse(baseClassroom: Classroom, allClasses: Classroom[]){
    const classroomNumber = baseClassroom.shortName.replace(/\D/g, "");
    const filteredClasses: Classroom[] = allClasses.filter(el => el.school.id === baseClassroom.school.id && el.shortName.replace(/\D/g, "") === classroomNumber)
    const cityHall: Classroom = { id: 999, name: 'ITATIBA', shortName: 'ITA', school: { id: 99, name: 'ITATIBA', shortName: 'ITA', inep: null, active: true }, studentClassrooms: allClasses.flatMap(cl => cl.studentClassrooms)} as unknown as Classroom
    return [ ...filteredClasses, cityHall ]
  }

  readingFluencyTotalizator(headers: qReadingFluenciesHeaders[], classroom: Classroom) {

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

// @ts-ignore
export const testController = new TestController();

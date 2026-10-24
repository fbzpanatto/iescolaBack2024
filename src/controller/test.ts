import { GenericController } from "./genericController";
import { Test } from "../model/Test";
import { classroomController } from "./classroom";
import { Classroom } from "../model/Classroom";
import { StudentClassroom } from "../model/StudentClassroom";
import { TestQuestion } from "../model/TestQuestion";
import { Request } from "express";
import {
  CLASSROOM_CATEGORIES,
  EXAMS_IDS_PRODUCTION,
  EXAMS_IDS_READING,
  OUT_CLASSROOMS,
  PER_CAT as pc,
  PER_CAT,
  QUESTION_OPTION_LABELS,
  QUESTION_OPTIONS_COUNT,
  QuestionOptionLabel,
  TEST_CATEGORIES_IDS as tcids
} from "../utils/enums";
import { EntityTarget } from "typeorm";
import { ReadingFluency } from "../model/ReadingFluency";
import { AllClassrooms, AlphaHeaders, CityHall, qReadingFluenciesHeaders, qYear, TestBodySave, TestQuestionFull, Totals, JwtPayload, TestPreviewGroup, TestPreviewResponse, TestQuestionWithImages } from "../interfaces/interfaces";
import { Helper } from "../utils/helpers";
import { reportController } from "./report";
import {deletarDoS3, moverParaQuestions} from "../services/s3.service";
import {QuestionImagePosition, QuestionImageType} from "../model/QuestionImage";
import { HttpError } from "../utils/helpers";
import { connectionPool } from "../services/db";

const QUESTION_TITLE_MAX_LENGTH = 5000
const QUESTION_OPTION_TEXT_MAX_LENGTH = 1000

type ValidatedQuestionOption = { label: QuestionOptionLabel, text: string, order: number }
type QuestionOptionRow = { id: number, label: string, text: string, order: number }
type NewQuestionInput = { answer?: unknown, question: { id?: unknown, title?: unknown, options?: unknown, images?: unknown } }
type PreparedNewQuestion = { options: ValidatedQuestionOption[], imagePositions: QuestionImagePosition[] }
type ExistingOptionsPlan = { rows: QuestionOptionRow[], validated: ValidatedQuestionOption[] }

class TestController extends GenericController<EntityTarget<Test>> {

  constructor() { super(Test) }

  async getStudents(req: Request, authUser: JwtPayload) {
    if (authUser.category === PER_CAT.ALUN) { return { status: 403, message: "Você não tem permissão para acessar este recurso." } }

    const testId = Number(req?.params.id)
    const classroomId = Number(req?.params.classroom);
    const scId = Number(req?.query.stc);
    const isHistory = Boolean(req?.query.isHistory);

    try {

      const testClassroom = await this.qTestClassroom(testId, classroomId)
      if(!testClassroom) { return { status: 404, message: 'Esse teste não existe para a sala em questão.' } }

      const tUser = await this.qUser(authUser.user)
      const masterUser = tUser?.categoryId === PER_CAT.ADMN || tUser?.categoryId === PER_CAT.SUPE || tUser?.categoryId === PER_CAT.SUPE_EI || tUser?.categoryId === PER_CAT.FORM;

      const { classrooms } = await this.qTeacherClassrooms(Number(authUser.user))
      if(!classrooms?.includes(classroomId) && !masterUser && !isHistory) { return { status: 403, message: "Você não tem permissão para acessar essa sala." } }

      const qTest = await this.qTestByIdAndYear(testId, String(req?.params.year))
      if(!qTest) return { status: 404, message: "Teste não encontrado" }
      const test = Helper.testFormater(qTest)

      const classroom = await this.qClassroom(classroomId)
      if(!classroom) return { status: 404, message: "Sala não encontrada" }

      let data: any = {}

      const alphabeticCategories = [tcids.LITE_1, tcids.LITE_2, tcids.LITE_3, tcids.EDU_INF, tcids.EDU_INF_PART]

      if(alphabeticCategories.includes(test.category.id)) {
        const headers = await this.qAlphabeticHeaders(test.period.year.name) as unknown as AlphaHeaders[]
        data = await this.alphabeticTest(headers, test, classroom, classroomId, tUser?.userId as number, isNaN(scId) ? null : Number(scId))
        return { status: 200, data: data };
      }

      if(Helper.isScoredTestCategory(test.category.id)) {

        await this.findAndDeleteStatusAndQuestions(testId, classroomId)

        await this.updateStudentTestStatus(testId, classroomId, test.period.year.name, tUser?.userId as number);

        const qTestQuestions = await this.qTestQuestions(test.id) as unknown as TestQuestion[]

        const questionGroups = await this.qTestQuestionsGroupsOnReport(testId)

        let classroomPoints = 0
        let classroomPercent = 0
        let validStudentsTotalizator = 0
        // Denominador legado por questão (só células com sala vinculada): base do % por letra, que não muda.
        const lettersTotals = new Map<number, number>()
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

            let element = totals.find(el => el.id === testQuestion.id)

            // Célula vazia (sem sala vinculada) de aluno elegível conta como erro: fica no denominador
            if(Helper.isUnassignedEmptyCell(studentQuestion)) {
              element!.tTotal += 1
              classroomPercent += 1
              element!.tRate = Helper.scoreRate(element!.tNumber, element!.tTotal)
              return acc
            }

            if((studentQuestion?.rClassroom?.id != classroom.id )){ return acc }

            if ((studentQuestion?.rClassroom?.id === classroom.id ) && studentQuestion?.answer != '' && studentQuestion?.answer != ' ' && testQuestion.answer?.trim().includes(studentQuestion?.answer.toUpperCase().trim())) {
              element!.tNumber += 1
              classroomPoints += 1
              acc += 1
            }

            element!.tTotal += 1
            classroomPercent += 1
            lettersTotals.set(testQuestion.id, (lettersTotals.get(testQuestion.id) ?? 0) + 1)
            element!.tRate = Helper.scoreRate(element!.tNumber, element!.tTotal)

            const letter = studentQuestion?.answer && studentQuestion.answer.trim().length ? studentQuestion.answer.toUpperCase().trim() : 'VAZIO';

            let ltItem = answersLetters.find(el => el.letter === letter)
            if(!ltItem) { ltItem = { letter, questions: [] }; answersLetters.push(ltItem) }

            let ltQ = ltItem.questions.find(tQ => tQ.id === testQuestion.id)
            if(!ltQ) { ltQ = { id: testQuestion.id, order: testQuestion.order, occurrences: 0, percentage: 0 }; ltItem.questions.push(ltQ) }

            ltQ.occurrences += 1

            answersLetters = answersLetters.map(el => ({...el, questions: el.questions.map(it => ({...it, percentage: Helper.scoreRate(it.occurrences, lettersTotals.get(testQuestion.id)!)}))})).sort((a, b) => a.letter.localeCompare(b.letter))

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
          classroomPercent: Helper.scoreRate(classroomPoints, classroomPercent)
        }

        return { status: 200, data: data };
      }

      if([tcids.READ_2, tcids.READ_3, tcids.PRO_TXT].includes(test.category.id)) {

        const examIds = tcids.PRO_TXT === test.category.id ? EXAMS_IDS_PRODUCTION : EXAMS_IDS_READING

        await this.findAndDeleteStatusAndReadingFluency(testId, classroomId)

        await this.updateReadingFluencyStatus(testId, classroomId, test.period.year.name, tUser?.userId as number);

        const headers = await this.qReadingFluencyHeaders(examIds)
        const fluencyHeaders = Helper.readingFluencyHeaders(headers)

        const preStudents = await this.stuClassReadFSql(test, Number(classroomId), test.period.year.name, isNaN(scId) ? null : Number(scId))

        await this.linkReadingSql(headers, preStudents, test, tUser?.userId as number, classroomId, test.period.year.name)

        let studentClassrooms = await this.getReadingFluencyStudentsSql(test, classroomId, test.period.year.name, isNaN(scId) ? null : Number(scId))

        studentClassrooms = await this.qStudentDisabilities(studentClassrooms) as unknown as StudentClassroom[]

        studentClassrooms = studentClassrooms.map((item: any) => {
          item.student.readingFluency = item.student.readingFluency.map((rF: ReadingFluency) => {
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

  async getFormData(_: Request) {
    try {
      const { disciplines, bimesters, testCategories, questionGroup } = await this.qTestFormData()
      return { status: 200, data: { disciplines, bimesters, testCategories, questionGroup } };
    } catch (error: any) { return { status: 500, message: error.message } }
  }

  async getFormDataByTestCategory(req: Request, authUser: JwtPayload) {
    try {
      let classrooms = ((await classroomController.getAllClassroomsByTestCategory(req, authUser)).data) as Array<{ id: number, name: string, school: string }>;
      classrooms = classrooms?.filter((el: any) => !OUT_CLASSROOMS.includes(el.id))
      return { status: 200, data: classrooms };
    } catch (error: any) { return { status: 500, message: error.message } }
  }

  async getGroupedFullParallel(req: Request, authUser: JwtPayload) {
    if (authUser.category === PER_CAT.ALUN) { return { status: 403, message: "Você não tem permissão para acessar este recurso." } }

    const classroom = req.query.classroom ?? req.params.classroom
    const bimester = req.query.bimester ?? req.params.bimester
    const year = req.query.year ?? req.params.year

    try {
      const qUt = await this.qTeacherByUser(authUser.user)
      const masterUser = qUt.person.category.id === PER_CAT.ADMN || qUt.person.category.id === PER_CAT.SUPE || qUt.person.category.id === PER_CAT.FORM

      const qClassroom = await this.qClassroom(Number(classroom))
      if (!qClassroom) return { status: 404, message: "Sala não encontrada" }

      const { classrooms } = await this.qTeacherClassrooms(authUser.user)
      if(!classrooms.includes(qClassroom.id) && !masterUser) { return { status: 403, message: "Você não tem permissão para acessar essa sala." } }

      const qYear = await this.qYearByName(String(year))
      if(!qYear) return { status: 404, message: "Ano não encontrado." }

      const classroomValue = `${Number(qClassroom.shortName.replace(/\D/g, ""))}`;

      const localTests = (await reportController.listAggregatedTests(Number(classroomValue), Number(bimester), String(year))).data;

      const response: any = { headers: [], schools: [] };
      if (!localTests?.length) { return { status: 200, data: response } }

      const qBimester = localTests[0].bimester

      const allPromises = localTests.map(async (el) => (await this.getGroupedFullParallelWrapper(el, qYear, qClassroom)).data);

      const allResults = await Promise.all(allPromises);

      const headers: string[] = [];
      const classroomMap = new Map();

      for (const [i, item] of allResults.entries()) {

        // 1. Captura o nome da prova
        let testName = item?.testName || 'Prova Pendente';

        // 2. Aplica as regras de abreviação visual para o Front-End
        testName = testName
          .replace(/AVALIAÇÃO/gi, 'AVL')
          .replace(/ITATIBA/gi, 'ITA')
          .replace(/SIMULADO/gi, 'SIM');

        // 3. Insere o nome formatado nos cabeçalhos
        headers.push(testName);

        const safeClassrooms = item?.classrooms || [];

        if (safeClassrooms.length === 0) {
          continue;
        }

        for (const el of safeClassrooms) {
          if (!classroomMap.has(el.id)) {
            classroomMap.set(el.id, {
              id: el.id,
              school: el.school,
              shortName: el.shortName,
              // CORREÇÃO 1: Inicializa o array com 0 em vez de null
              classroomAvg: new Array(allResults.length).fill(0)
            });
          }

          // CORREÇÃO 2: Se tRateAvg for null ou undefined, salva como 0
          classroomMap.get(el.id).classroomAvg[i] = el.tRateAvg ?? 0;
        }
      }

      let mappedClassrooms = Array.from(classroomMap.values());

      // --- CORREÇÃO DA ORDEM AQUI ---

      // 2. Separa os elementos especiais (Município e Escola Agregada) das salas comuns
      const cityHallId = 999;
      const schoolAggregateId = qClassroom.school.id; // O ID da escola agregada geralmente é o mesmo da escola da sala

      const cityHall = mappedClassrooms.find((c: any) => c.id === cityHallId);
      const schoolAggregate = mappedClassrooms.find((c: any) => c.id === schoolAggregateId && c.name === 'ESCOLA'); // Validação extra pelo nome se necessário

      // Filtra para deixar apenas as salas comuns
      let sortedClassrooms = mappedClassrooms.filter((c: any) => c.id !== cityHallId && (c.id !== schoolAggregateId || c.name !== 'ESCOLA'));

      // 3. Ordena as salas comuns alfabeticamente (ShortName)
      sortedClassrooms.sort((a: any, b: any) => a.shortName.localeCompare(b.shortName));

      // 4. Reconstrói o array na ordem desejada: [Salas..., Escola, Município]
      mappedClassrooms = [...sortedClassrooms];

      if (schoolAggregate) { mappedClassrooms.push(schoolAggregate); }
      if (cityHall) { mappedClassrooms.push(cityHall); }

      // -----------------------------

      return { status: 200, data: { headers, classrooms: mappedClassrooms, school: qClassroom.school.name, year: qYear.name, bimester: qBimester } };
    }
    catch (error: any) { console.log('getGroupedFullParallel', error); return { status: 500, message: error.message } }
  }

  async getGroupedFullParallelWrapper(test: { id: number, categoryId: number, category: string, bimester: string, year: string, testName: string, disciplineName: string  }, year: qYear, qClassroom: Classroom) {

    const qTestQuestions = await this.qTestQuestions(test.id) as unknown as TestQuestion[];
    if (!qTestQuestions) return { status: 404, message: "Questões não encontradas" };

    const testQuestionsIds = qTestQuestions.map(tq => tq.id);
    const questionGroups = await this.qTestQuestionsGroupsOnReport(test.id);

    const classroomNumber = qClassroom.shortName.replace(/\D/g, "");
    const baseSchoolId = qClassroom.school.id;

    const pResult = Helper.testGraph((await this.qGraphTest(test.id, testQuestionsIds, year)) as Array<any>);

    if (!pResult || pResult.length === 0) { return { status: 200, data: [] } }

    return { status: 200, data: Helper.classroomDataStructure(pResult, test, questionGroups, qTestQuestions, baseSchoolId, classroomNumber) };
  }

  async getGraphic(req: Request<{ id: string, classroom: string }>, authUser: JwtPayload) {
    if (authUser.category === PER_CAT.ALUN) { return { status: 403, message: "Você não tem permissão para acessar este recurso." } }

    const { id: testId, classroom: classroomId } = req.params

    try {

      const year = await this.qYearByName(String(req.query?.year))
      if(!year) return { status: 404, message: "Ano não encontrado." }

      const qUt = await this.qTeacherByUser(authUser.user)

      const masterUser = qUt.person.category.id === PER_CAT.ADMN || qUt.person.category.id === PER_CAT.SUPE || qUt.person.category.id === PER_CAT.SUPE_EI || qUt.person.category.id === PER_CAT.FORM

      const baseTest = Helper.testFormater(await this.qTestByIdAndYear(Number(testId), year.name))

      const { classrooms } = await this.qTeacherClassrooms(authUser.user)

      if(!classrooms.includes(Number(classroomId)) && !masterUser) { return { status: 403, message: "Você não tem permissão para acessar essa sala." } }

      const qClassroom = await this.qClassroom(Number(classroomId))
      if (!qClassroom) return { status: 404, message: "Sala não encontrada" }

      const serieFilter = `${Number(qClassroom.shortName.replace(/\D/g, ""))}%`;

      if([tcids.EDU_INF, tcids.LITE_1, tcids.LITE_2, tcids.LITE_3, tcids.EDU_INF_PART].includes(baseTest.category.id)) {

        const [preheaders, tests] = await Promise.all([
          this.qAlphabeticHeaders(year.name) as Promise<any[]>,
          this.qAlphabeticTests(baseTest.category.id, baseTest.discipline.id, year.name) as Promise<any[]>
        ])

        let testQuestionsIds: number[] = []

        if((baseTest.category?.id != tcids.LITE_1 && baseTest.category?.id != tcids.EDU_INF && baseTest.category?.id != tcids.EDU_INF_PART) && tests.length > 0) {
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

      if(Helper.isScoredTestCategory(baseTest.category.id)) {
        const qTestQuestions = await this.qTestQuestions(testId) as unknown as TestQuestion[];
        if (!qTestQuestions) return { status: 404, message: "Questões não encontradas" };

        const testQuestionsIds = qTestQuestions.map(tq => tq.id);
        const questionGroups = await this.qTestQuestionsGroupsOnReport(Number(testId));

        const classroomNumber = qClassroom.shortName.replace(/\D/g, "");
        const baseSchoolId = qClassroom.school.id;

        const pResult = Helper.testGraph((await this.qGraphTest(testId, testQuestionsIds, year)) as Array<any>);

        return { status: 200, data: Helper.classroomDataStructure(pResult, baseTest, questionGroups, qTestQuestions, baseSchoolId, classroomNumber) };
      }

      let data;

      switch (baseTest.category?.id) {
        case tcids.PRO_TXT:
        case tcids.READ_2:
        case tcids.READ_3: {

          const examIds = tcids.PRO_TXT === baseTest.category?.id ? EXAMS_IDS_PRODUCTION : EXAMS_IDS_READING

          const [headers, test] = await Promise.all([
            this.qReadingFluencyHeaders(examIds),
            this.getReadingFluencyForGraphic(testId, String(year.id)) as Promise<Test>
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
    }
    catch (error: any) { return { status: 500, message: error.message } }
  }

  async findAllByYear(req: Request<{ year: string }>, authUser: JwtPayload) {
    try {
      const bimesterId = !isNaN(parseInt(req.query.bimester as string)) ? parseInt(req.query.bimester as string) : null;
      const disciplineId = !isNaN(parseInt(req.query.discipline as string)) ? parseInt(req.query.discipline as string) : null;
      const search = req.query.search as string || '';
      const limit = !isNaN(parseInt(req.query.limit as string)) ? parseInt(req.query.limit as string) : 100;
      const offset = !isNaN(parseInt(req.query.offset as string)) ? parseInt(req.query.offset as string) : 0;

      let yearName = req.params.year;

      if (yearName.length != 4) { const currentYear = await this.qCurrentYear(); yearName = currentYear.name }

      const qUserTeacher = await this.qTeacherByUser(authUser.user);

      const masterTeacher =
        qUserTeacher.person.category.id === PER_CAT.ADMN ||
        qUserTeacher.person.category.id === PER_CAT.SUPE ||
        qUserTeacher.person.category.id === PER_CAT.SUPE_EI ||
        qUserTeacher.person.category.id === PER_CAT.FORM;

      const isSuperEI = qUserTeacher.person.category.id === pc.SUPE_EI

      const { classrooms } = await this.qTeacherClassrooms(authUser.user);
      const { disciplines } = await this.qTeacherDisciplines(authUser.user);

      const testsMap = new Map<number, any>();

      const rows = await this.qfindAllByYearNewImplementation(
        isSuperEI,
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
              year: { id: row.year_id, name: row.year_name, active: row.year_active },
              bimester: {
                id: row.bimester_id,
                name: row.bimester_name,
                testName: row.test_name.includes('DIAGNÓSTICA') ? 'TODOS': row.bimester_test_name
              }
            },
            category: { id: row.category_id, name: row.category_name },
            discipline: { id: row.discipline_id, name: row.discipline_name },
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
            nickname: row.classroom_nickname,
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

  async getById(req: Request<{ id: string }>, authUser: JwtPayload) {
    if (authUser.category === PER_CAT.ALUN) { return { status: 403, message: "Você não tem permissão para acessar este recurso." } }

    const { id } = req.params
    try {
      const qUserTeacher = await this.qTeacherByUser(authUser.user)
      const masterUser = qUserTeacher.person.category.id === PER_CAT.ADMN || qUserTeacher.person.category.id === PER_CAT.SUPE || qUserTeacher.person.category.id === PER_CAT.FORM;

      const test = await this.qTestByIdWithClassrooms(parseInt(id))
      if(qUserTeacher.person.id !== test?.person!.id && !masterUser) return { status: 403, message: "Você não tem permissão para editar esse teste." }
      if (!test) { return { status: 404, message: 'Data not found' } }

      let formatedEndedAt;

      if(test.endedAt) { formatedEndedAt = Helper.formatDateToDDMMYYYY(test.endedAt) }

      const testQuestions = await this.getTestQuestions(test.id)
      return { status: 200, data: { ...test, endedAt: test.endedAt ? formatedEndedAt: test.endedAt , testQuestions } };
    }
    catch (error: any) { return { status: 500, message: error.message } }
  }

  async getPreview(req: Request<{ id: string }>, authUser: JwtPayload): Promise<TestPreviewResponse> {
    try {
      const forbidden = { status: 403, message: "Você não tem permissão para visualizar esta prova." }

      if (authUser.category === PER_CAT.ALUN) { return forbidden }

      const testId = Number(req.params.id)
      if (!Number.isInteger(testId) || testId <= 0) { return { status: 400, message: "Identificador de prova inválido." } }

      const qUserTeacher = await this.qTeacherByUser(authUser.user)
      const categoryId = qUserTeacher.person.category.id
      if (categoryId === PER_CAT.ALUN) { return forbidden }

      const scope = await this.qTestPreviewScope(testId)
      if (!scope) { return { status: 404, message: "Prova não encontrada." } }

      const qTest = await this.qTestByIdAndYear(testId, scope.yearName)
      if (!qTest) { return { status: 404, message: "Prova não encontrada." } }

      if (qTest.test_category_id !== tcids.SIM_ITA) { return { status: 400, message: "A pré-visualização está disponível apenas para simulados." } }

      const canView = await this.canPreviewTest(authUser.user, categoryId, qUserTeacher.person.id === qTest.person_id, qTest.discipline_id, scope.classrooms)
      if (!canView) { return forbidden }

      const qTqs = await this.qTestQuestionsWithTitle(testId) as TestQuestionWithImages[]
      if (!qTqs || qTqs.length === 0) { return { status: 400, message: "Esta prova ainda não possui questões." } }

      const groupMap = new Map<number, TestPreviewGroup>()

      qTqs.forEach(({ answer: _answer, ...tQ }) => {
        const grpId = tQ.questionGroup.id
        const group = groupMap.get(grpId) ?? { id: grpId, name: tQ.questionGroup.name, questions: [] }
        group.questions.push(tQ)
        groupMap.set(grpId, group)
      })

      const testQuestions = Array.from(groupMap.values())

      return { status: 200, data: { test: { ...qTest, testQuestions } } }
    }
    catch (error: unknown) { console.error(error); return { status: 500, message: error instanceof Error ? error.message : String(error) } }
  }

  private async canPreviewTest(userId: number, categoryId: number, isOwner: boolean, disciplineId: number, testClassrooms: { id: number, categoryId: number }[]): Promise<boolean> {
    if (categoryId === PER_CAT.ADMN || categoryId === PER_CAT.SUPE || categoryId === PER_CAT.FORM) { return true }
    if (isOwner) { return true }
    if (categoryId === PER_CAT.SUPE_EI) { return testClassrooms.some(c => c.categoryId === CLASSROOM_CATEGORIES.EI) }

    const { classrooms } = await this.qTeacherClassrooms(userId)
    const { disciplines } = await this.qTeacherDisciplines(userId)

    if (!disciplines.includes(Number(disciplineId))) { return false }
    return testClassrooms.some(c => classrooms.includes(c.id))
  }

  async saveTest(body: TestBodySave, authUser: JwtPayload) {
    const classesIds = body.classroom.map((classroom: { id: number }) => classroom.id);
    let conn;
    try {
      conn = await connectionPool.getConnection();
      await conn.beginTransaction();

      const qUserTeacher = await this.qTeacherByUser(authUser.user);

      if([PER_CAT.MONI, PER_CAT.SECR, PER_CAT.PROF, PER_CAT.COOR, PER_CAT.VICE, PER_CAT.DIRE].includes(qUserTeacher.person.category.id)) {
        throw new HttpError(403, 'Você não tem permissão para criar uma avaliação.');
      }

      if(!qUserTeacher) throw new HttpError(404, "Usuário inexistente");

      const isSimulado = Number(body.category.id) === tcids.SIM_ITA;
      if (isSimulado && typeof body.has_token !== 'boolean') { throw new HttpError(400, "Valor inválido para o campo has_token.") }
      const isTokenRequired = isSimulado ? Boolean(body.has_token) : null;

      const [ checkYearRows ] = await conn.query(`SELECT id, active FROM year WHERE id = ? LIMIT 1`, [body.year.id]);
      const checkYear = (checkYearRows as any[])[0];
      if(!checkYear) throw new HttpError(404, "Ano não encontrado");
      if(!checkYear.active) throw new HttpError(400, "Não é possível criar um teste para um ano letivo inativo.");

      const [ periodRows ] = await conn.query(
        `
        SELECT p.id AS period_id,
               y.id AS year_id, y.name AS year_name, y.active AS year_active, y.createdAt AS year_createdAt, y.endedAt AS year_endedAt,
               bm.id AS bimester_id, bm.name AS bimester_name, bm.testName AS bimester_testName
        FROM period AS p
          INNER JOIN year AS y ON p.yearId = y.id
          INNER JOIN bimester AS bm ON p.bimesterId = bm.id
        WHERE p.yearId = ? AND p.bimesterId = ?
        LIMIT 1
      `,
        [body.year.id, body.bimester.id]
      );
      const periodRow = (periodRows as any[])[0];
      if(!periodRow) throw new HttpError(404, "Período não encontrado");

      const period = {
        id: periodRow.period_id,
        year: { id: periodRow.year_id, name: periodRow.year_name, active: Boolean(periodRow.year_active), createdAt: Helper.toUtcDate(periodRow.year_createdAt), endedAt: Helper.toUtcDate(periodRow.year_endedAt) },
        bimester: { id: periodRow.bimester_id, name: periodRow.bimester_name, testName: periodRow.bimester_testName }
      };

      const checkCategories = [
        tcids.LITE_1,
        tcids.LITE_2,
        tcids.LITE_3,
        tcids.EDU_INF,
        tcids.EDU_INF_PART,
      ]

      if(checkCategories.includes(body.category.id)) {
        const [ dupRows ] = await conn.query(`SELECT id FROM test WHERE categoryId = ? AND disciplineId = ? AND periodId = ? LIMIT 1`, [body.category.id, body.discipline.id, period.id]);
        if((dupRows as any[])[0]) { throw new HttpError(409, `Já existe uma avaliação criada com a categoria, disciplina e período informados.`) }
      }

      // Índices esperados: classroom(id) [PK], student_classroom(classroomId) [existe]
      const [ classroomRows ] = await conn.query(
        `
        SELECT c.id, c.shortName
        FROM classroom AS c
        WHERE c.id IN (?)
          AND EXISTS (
            SELECT 1 FROM student_classroom AS sc
            WHERE sc.classroomId = c.id AND sc.yearId = ? AND sc.startedAt < ? AND sc.endedAt IS NULL
          )
        ORDER BY c.id ASC
      `,
        [classesIds, body.year.id, new Date()]
      );
      const classes = classroomRows as { id: number, shortName: string }[];

      if(!classes || classes.length < 1) { throw new HttpError(400, "Não existem alunos matriculados em uma ou mais salas informadas.") }

      let endedAt: Date | undefined;
      if (body.endedAt && body.endedAt.length === 10) { endedAt = Helper.parseDDMMYYYYtoEndOfDayUTC(body.endedAt) }

      const haveQuestions = [ tcids.LITE_2, tcids.LITE_3, tcids.SIM_ITA, tcids.AVL_ITA ];

      const preparedQuestions = new Map<object, PreparedNewQuestion>();
      if (haveQuestions.includes(body.category.id) && body.testQuestions?.length) {
        for (const tq of body.testQuestions) {
          const prepared = this.prepareNewQuestion(tq);
          if (prepared) { preparedQuestions.set(tq, prepared) }
        }
      }

      const createdAt = new Date();

      const [ insertTestResult ]: any = await conn.query(
        `INSERT INTO test (name, categoryId, disciplineId, personId, periodId, endedAt, is_token_required, createdAt, createdByUser) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [body.name, body.category.id, body.discipline.id, qUserTeacher.person.id, period.id, endedAt ?? null, isTokenRequired, createdAt, qUserTeacher.person.user.id]
      );
      const testId = insertTestResult.insertId;

      const testClassroomValues = classes.map(el => [testId, el.id]);
      await conn.query(`INSERT INTO test_classroom (testId, classroomId) VALUES ?`, [testClassroomValues]);

      if(haveQuestions.includes(body.category.id) && body.testQuestions?.length) {
        const testQuestionValues: any[] = [];
        const classroomNumber = parseInt(classes[0].shortName.charAt(0))

        for (const tq of body.testQuestions) {
          let question: any = tq.question;

          if (!question.id) {
            if (!question.classroomCategory?.id) { throw new HttpError(400, "Todas as questões devem ter categoria definida") }

            // skills: number[] é a fonte de verdade. Formato antigo (question.skill: {id}, sem
            // skills — aba antiga do navegador) vira um único vínculo. question.skillId não é
            // mais gravada (Deploy 1 da Fase 5). Ver skill question-skill-nn.
            const validatedSkills = await this.resolveNewQuestionSkills(conn, question);

            const [ insertQuestionResult ]: any = await conn.query(
              `INSERT INTO question (title, personId, disciplineId, classroomNumber, classroomCategoryId, createdAt, createdByUser) VALUES (?, ?, ?, ?, ?, ?, ?)`,
              [question.title, question.person?.id || qUserTeacher.person.id, body.discipline.id, classroomNumber, question.classroomCategory.id, createdAt, qUserTeacher.person.user.id]
            );
            const newQuestionId = insertQuestionResult.insertId;

            if (validatedSkills.length > 0) {
              const questionSkillValues = validatedSkills.map(s => [newQuestionId, s.id, createdAt, qUserTeacher.person.user.id]);
              await conn.query(`INSERT INTO question_skill (questionId, skillId, createdAt, createdByUser) VALUES ?`, [questionSkillValues]);
            }

            const prepared = preparedQuestions.get(tq);
            await this.insertQuestionOptions(conn, newQuestionId, prepared?.options ?? [], createdAt, qUserTeacher.person.user.id);

            const incomingImages = question.images; // captura antes de sobrescrever "question" com o id novo
            question = { id: newQuestionId };

            if (Array.isArray(incomingImages) && incomingImages.length > 0) {
              const questionImageValues = [];

              for (const [index, img] of incomingImages.entries()) {
                const finalKey = await moverParaQuestions(img.s3Key);
                questionImageValues.push([
                  img.type === 'main' ? QuestionImageType.MAIN : QuestionImageType.SUPPORT,
                  img.order,
                  prepared?.imagePositions[index] ?? QuestionImagePosition.BEFORE,
                  finalKey,
                  newQuestionId,
                  createdAt,
                  qUserTeacher.person.user.id
                ]);
              }

              await conn.query(`INSERT INTO question_image (type, \`order\`, position, s3Key, questionId, createdAt, createdByUser) VALUES ?`, [questionImageValues]);
            }
          }

          testQuestionValues.push([tq.order, tq.answer, tq.questionGroup.id, tq.active, question.id, testId, createdAt, qUserTeacher.person.user.id]);
        }

        await conn.query(`INSERT INTO test_question (\`order\`, answer, questionGroupId, active, questionId, testId, createdAt, createdByUser) VALUES ?`, [testQuestionValues]);
      }

      await conn.commit();

      const test = {
        id: testId,
        name: body.name,
        category: body.category,
        discipline: body.discipline,
        person: qUserTeacher.person,
        period,
        classrooms: classes.map(el => ({ id: el.id })),
        createdAt,
        createdByUser: qUserTeacher.person.user.id,
        endedAt
      };

      return { status: 201, data: test };
    }
    catch (error: any) {
      if (conn) await conn.rollback();
      if (error instanceof HttpError) { return { status: error.status, message: error.message } }
      console.error(error);
      return { status: 500, message: error.message };
    }
    finally { if (conn) { conn.release() } }
  }

  async updateTest(id: number | string, req: Request<{ id: number | string }>, authUser: JwtPayload) {
    let conn;
    try {
      conn = await connectionPool.getConnection();
      await conn.beginTransaction();

      const uTeacher = await this.qTeacherByUser(authUser.user)
      const userId = uTeacher.person.user.id
      const masterUser = uTeacher.person.category.id === PER_CAT.ADMN ||
        uTeacher.person.category.id === PER_CAT.SUPE ||
        uTeacher.person.category.id === PER_CAT.FORM;

      // Só id/personId/disciplineId: são os únicos campos de test.person/test.discipline
      // realmente usados abaixo (permissão e disciplina de questão nova) — dispensa JOIN.
      const [ testRows ] = await conn.query(`SELECT id, personId, disciplineId, categoryId FROM test WHERE id = ? LIMIT 1`, [Number(id)]);
      const test = (testRows as any[])[0];
      if (!test) throw new HttpError(404, "Teste não encontrado")
      if (uTeacher.person.id !== test.personId && !masterUser) {
        throw new HttpError(403, "Você não tem permissão para editar esse teste.")
      }

      let endedAt: Date | undefined;
      if (req.body.endedAt && req.body.endedAt.length === 10) {
        endedAt = Helper.parseDDMMYYYYtoEndOfDayUTC(req.body.endedAt)
      }

      const updatedAt = new Date();

      const testSetClauses = ['name = ?', 'active = ?', 'hideAnswers = ?', 'updatedAt = ?', 'updatedByUser = ?'];
      const testSetParams: any[] = [req.body.name, req.body.active, req.body.hideAnswers, updatedAt, userId];
      if (endedAt !== undefined) { testSetClauses.push('endedAt = ?'); testSetParams.push(endedAt); }
      if (Number(test.categoryId) === tcids.SIM_ITA) {
        if (typeof req.body.has_token !== 'boolean') { throw new HttpError(400, "Valor inválido para o campo has_token.") }
        testSetClauses.push('is_token_required = ?'); testSetParams.push(Boolean(req.body.has_token));
      }
      testSetParams.push(test.id);
      await conn.query(`UPDATE test SET ${testSetClauses.join(', ')} WHERE id = ?`, testSetParams);

      // Sinaliza (sem virar erro) quando o front tentou alterar skills de uma
      // questão compartilhada e a trava isShared descartou a tentativa. Declarado
      // fora do "if" abaixo porque o bloco de retorno final também precisa dele.
      // Só entra no corpo da resposta quando não está vazio — ver retorno no final.
      const warnings: { questionId: number; message: string }[] = [];

      if (req.body.testQuestions?.length) {

        // Campos que existem só de um lado ou só servem de transporte.
        // Sem isso a comparação acusaria diferença em todo save.
        //   questionImages / inUse  -> só existem no objeto vindo do banco
        //   images / imagesModified -> só existem no payload do front
        //   skills                  -> vive em question_skill, não em question; sincronizada
        //                              à parte por comparação de conjuntos (ver abaixo). O
        //                              array do diffsStrict é posicional, então nem serviria
        //                              pra detectar mudança de skills corretamente.
        //   options                 -> vive em question_option, sincronizada à parte por label
        const IGNORE = ['questionImages', 'inUse', 'images', 'imagesModified', 'skills', 'options'];

        const bodyTq = req.body.testQuestions as any[]
        const dataTq: TestQuestionFull[] = await this.getTestQuestions(test.id)

        // Pré-passada: toda validação de alternativas/posição roda antes de qualquer efeito no S3.
        const preparedNew = new Map<object, PreparedNewQuestion>();
        const optionPlans = new Map<object, ExistingOptionsPlan>();

        for (const next of bodyTq) {
          const curr = dataTq.find(el => el.id === next.id);

          if (!curr) {
            const prepared = this.prepareNewQuestion(next);
            if (prepared) { preparedNew.set(next, prepared) }
            continue;
          }

          const plan = await this.prepareExistingQuestionOptions(conn, curr, next);
          if (plan) { optionPlans.set(next, plan) }

          if (!this.isSharedQuestion(curr) && next.question?.imagesModified === true) {
            this.resolveImagePositions(next.question.images);
          }
        }

        for (let next of bodyTq) {
          const curr = dataTq.find(el => el.id === next.id);

          // ------------------------------------------------------------------
          // NOVA testQuestion (questão nova OU questão existente sendo vinculada)
          // ------------------------------------------------------------------
          if (!curr) {

            let questionToSave: any = next.question;

            if (!questionToSave.id) {
              // questão realmente nova: cria a Question e promove as imagens
              if (!questionToSave.classroomCategory?.id) {
                throw new HttpError(400, "Questão nova deve ter categoria definida")
              }

              // skills: number[] é a fonte de verdade. Formato antigo (question.skill: {id}, sem
              // skills — aba antiga do navegador) vira um único vínculo. question.skillId não é
              // mais gravada (Deploy 1 da Fase 5). Ver skill question-skill-nn.
              const validatedSkills = await this.resolveNewQuestionSkills(conn, questionToSave);

              const [ insertQuestionResult ]: any = await conn.query(
                `INSERT INTO question (title, personId, disciplineId, classroomCategoryId, createdAt, createdByUser) VALUES (?, ?, ?, ?, ?, ?)`,
                [questionToSave.title, questionToSave.person?.id || uTeacher.person.id, test.disciplineId, questionToSave.classroomCategory.id, new Date(), userId]
              );
              const newQuestionId = insertQuestionResult.insertId;

              if (validatedSkills.length > 0) {
                const questionSkillValues = validatedSkills.map(s => [newQuestionId, s.id, new Date(), userId]);
                await conn.query(`INSERT INTO question_skill (questionId, skillId, createdAt, createdByUser) VALUES ?`, [questionSkillValues]);
              }

              const prepared = preparedNew.get(next);
              await this.insertQuestionOptions(conn, newQuestionId, prepared?.options ?? [], updatedAt, userId);

              // captura antes de sobrescrever questionToSave com o id novo
              const incomingImages = questionToSave.images;

              if (Array.isArray(incomingImages) && incomingImages.length > 0) {
                const questionImageValues = [];

                for (const [index, img] of incomingImages.entries()) {
                  const finalKey = await moverParaQuestions(img.s3Key);
                  questionImageValues.push([
                    img.type === 'main' ? QuestionImageType.MAIN : QuestionImageType.SUPPORT,
                    img.order,
                    prepared?.imagePositions[index] ?? QuestionImagePosition.BEFORE,
                    finalKey,
                    newQuestionId,
                    new Date(),
                    userId
                  ]);
                }

                await conn.query(`INSERT INTO question_image (type, \`order\`, position, s3Key, questionId, createdAt, createdByUser) VALUES ?`, [questionImageValues]);
              }

              questionToSave = { id: newQuestionId };
            }

            await conn.query(
              `INSERT INTO test_question (\`order\`, answer, questionGroupId, active, questionId, testId, createdAt, createdByUser) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
              [next.order, next.answer, next.questionGroup.id, next.active, questionToSave.id, test.id, new Date(), userId]
            );

            continue;
          }

          // ------------------------------------------------------------------
          // testQuestion EXISTENTE
          // ------------------------------------------------------------------

          // inUse vem do getTestQuestions, já descontando a prova corrente.
          // É calculado no servidor — não confiamos em nada vindo do front.
          const isShared = this.isSharedQuestion(curr);

          if (this.diffsStrict(curr, next, IGNORE)) {
            // questão compartilhada: só a referência, para não sobrescrever a Question original
            const questionIdForUpdate = isShared ? curr.question.id : next.question.id;

            await conn.query(
              `UPDATE test_question SET \`order\` = ?, answer = ?, questionGroupId = ?, active = ?, questionId = ?, updatedAt = ?, updatedByUser = ? WHERE id = ?`,
              [next.order, next.answer, next.questionGroup.id, next.active, questionIdForUpdate, updatedAt, userId, next.id]
            );
          }

          // skills: number[] (Fase 3) — presente e é a fonte de verdade quando o front já
          // migrou (Fase 4). Ausente/undefined -> nenhuma operação em question_skill.
          const nextSkills = (next.question as any).skills;
          const hasNewSkillsFormat = Array.isArray(nextSkills);

          // Título, categoria, pessoa e disciplina vivem em Question:
          // bloqueados quando a questão pertence também a outra prova.
          if (!isShared && this.diffsStrict(curr.question, next.question, IGNORE)) {
            const questionSetClauses = ['title = ?', 'personId = ?', 'disciplineId = ?', 'classroomCategoryId = ?', 'updatedAt = ?', 'updatedByUser = ?'];
            const questionSetParams: any[] = [next.question.title, next.question.person.id, next.question.discipline.id, next.question.classroomCategory.id, updatedAt, userId];

            questionSetParams.push(curr.question.id);
            await conn.query(`UPDATE question SET ${questionSetClauses.join(', ')} WHERE id = ?`, questionSetParams);
          }

          // ------------------------------------------------------------------
          // Sincronização de question_skill (Fase 3) — comparação de conjuntos de
          // id, independente do diffsStrict (que é posicional e não serviria aqui).
          // skills: [] é estado legítimo (questão sem habilidade) e sincroniza
          // normalmente. Bloqueada por completo quando a questão é compartilhada —
          // mesma trava que já protegia título/categoria/skill único.
          // ------------------------------------------------------------------
          if (!isShared && hasNewSkillsFormat) {
            const validatedSkills = await this.validateSkillIds(conn, nextSkills);

            const [ currSkillRows ] = await conn.query(`SELECT skillId FROM question_skill WHERE questionId = ?`, [curr.question.id]);
            const currIds = new Set((currSkillRows as any[]).map(r => r.skillId as number));
            const nextIds = new Set(validatedSkills.map(s => s.id));

            const toInsert = [...nextIds].filter(skillId => !currIds.has(skillId));
            const toDelete = [...currIds].filter(skillId => !nextIds.has(skillId));

            if (toInsert.length > 0) {
              const values = toInsert.map(skillId => [curr.question.id, skillId, updatedAt, userId]);
              await conn.query(`INSERT INTO question_skill (questionId, skillId, createdAt, createdByUser) VALUES ?`, [values]);
            }

            if (toDelete.length > 0) {
              await conn.query(`DELETE FROM question_skill WHERE questionId = ? AND skillId IN (?)`, [curr.question.id, toDelete]);
            }
          } else if (isShared && hasNewSkillsFormat) {
            // Mesma trava, só que aqui é pra AVISAR em vez de sincronizar. Não chama
            // validateSkillIds de propósito — hoje nenhuma validação de skills roda pra
            // questão compartilhada (o bloco de sincronização inteiro vive dentro de
            // !isShared), e não é este ajuste que deve começar a rejeitar com 400 um
            // payload malformado que de qualquer forma não seria escrito. Só compara
            // valores brutos pra decidir se havia uma tentativa real de mudança.
            const [ currSkillRows ] = await conn.query(`SELECT skillId FROM question_skill WHERE questionId = ?`, [curr.question.id]);
            const currIds = new Set((currSkillRows as any[]).map((r: any) => r.skillId as number));
            const nextIds = new Set((nextSkills as any[]).filter((v: any) => Number.isInteger(v)));

            const changed = currIds.size !== nextIds.size || [...nextIds].some(id => !currIds.has(id));
            if (changed) {
              warnings.push({ questionId: curr.question.id, message: 'Habilidades não alteradas: questão em uso em outra prova.' });
            }
          }

          const optionsPlan = optionPlans.get(next);
          if (optionsPlan) {
            if (isShared) {
              if (this.optionsDiffer(next.question.options, optionsPlan.rows)) {
                warnings.push({ questionId: curr.question.id, message: 'Alternativas não alteradas: questão em uso em outra prova.' });
              }
            } else if (optionsPlan.rows.length === 0) {
              if (next.question.options.length > 0) {
                warnings.push({ questionId: curr.question.id, message: 'Alternativas não gravadas: questão no modelo antigo.' });
              }
            } else {
              await this.syncQuestionOptions(conn, curr.question.id, optionsPlan, updatedAt, userId);
            }
          }

          // questionGroup pertence ao contexto da prova: segue editável sempre.
          if (next.questionGroup && this.diffsStrict(curr.questionGroup, next.questionGroup, IGNORE)) {
            await conn.query(
              `UPDATE question_group SET name = ?, updatedAt = ?, updatedByUser = ? WHERE id = ?`,
              [next.questionGroup.name, updatedAt, userId, next.questionGroup.id]
            );
          }

          // ----------------------------------------------------------------
          // Diff de imagens — duas condições cumulativas:
          //   !isShared      -> a questão não pertence também a outra prova
          //   imagesModified -> o admin abriu o modal e mexeu nas imagens
          // Sem o flag, um array vazio de questão apenas carregada seria lido
          // como "remover todas" e apagaria arquivos reais do S3.
          // ----------------------------------------------------------------
          const imagesModified = (next.question as any).imagesModified === true;
          const nextImages = (next.question as any).images;

          if (!isShared && imagesModified && Array.isArray(nextImages)) {

            const currImages = (curr.question as any).questionImages || [];
            const currById = new Map(currImages.map((img: any) => [img.id, img]));
            const nextIds = new Set(nextImages.filter((img: any) => img.id).map((img: any) => img.id));

            // 1. removidas: existiam no banco e não vieram mais no array
            for (const img of currImages as any[]) {
              if (!nextIds.has(img.id)) {
                // só apaga fisicamente arquivos do fluxo novo (questions/ ou tmp/);
                // legados na raiz perdem o vínculo mas permanecem no bucket
                if (this.podeApagarDoS3(img.s3Key)) { await deletarDoS3(img.s3Key); }
                await conn.query(`DELETE FROM question_image WHERE id = ?`, [img.id]);
              }
            }

            // 2. novas ou substituídas
            for (const img of nextImages) {

              if (!img.id) {
                const finalKey = await moverParaQuestions(img.s3Key);
                await conn.query(
                  `INSERT INTO question_image (type, \`order\`, position, s3Key, questionId, createdAt, createdByUser) VALUES (?, ?, ?, ?, ?, ?, ?)`,
                  [img.type === 'main' ? QuestionImageType.MAIN : QuestionImageType.SUPPORT, img.order, this.resolveImagePosition(img.position), finalKey, curr.question.id, new Date(), userId]
                );
                continue;
              }

              const existing = currById.get(img.id) as any;
              if (!existing) continue; // id enviado não bate com nenhum registro atual

              // front antigo não envia position: manter a atual, nunca resetar 'after' para 'before'
              const nextPosition = img.position !== undefined ? this.resolveImagePosition(img.position) : existing.position;

              // s3Key nova apontando para tmp/ -> substituição de arquivo
              if (img.s3Key !== existing.s3Key && String(img.s3Key).startsWith('tmp/')) {
                const finalKey = await moverParaQuestions(img.s3Key);
                const oldKey = existing.s3Key;

                await conn.query(
                  `UPDATE question_image SET s3Key = ?, \`order\` = ?, type = ?, position = ?, updatedAt = ?, updatedByUser = ? WHERE id = ?`,
                  [finalKey, img.order, img.type === 'main' ? QuestionImageType.MAIN : QuestionImageType.SUPPORT, nextPosition, updatedAt, userId, img.id]
                );

                if (this.podeApagarDoS3(oldKey)) { await deletarDoS3(oldKey); }
                continue;
              }

              // só reordenação / troca de tipo, sem arquivo novo
              if (img.order !== existing.order || img.type !== existing.type || nextPosition !== existing.position) {
                await conn.query(
                  `UPDATE question_image SET \`order\` = ?, type = ?, position = ?, updatedAt = ?, updatedByUser = ? WHERE id = ?`,
                  [img.order, img.type === 'main' ? QuestionImageType.MAIN : QuestionImageType.SUPPORT, nextPosition, updatedAt, userId, img.id]
                );
              }
            }
          }
        }
      }

      await conn.commit();

      const result = await this.qTestById(test.id);
      return warnings.length > 0
        ? { status: 200, data: result, warnings }
        : { status: 200, data: result };
    }
    catch (error: any) {
      if (conn) await conn.rollback();
      if (error instanceof HttpError) { return { status: error.status, message: error.message } }
      console.error(error);
      return { status: 500, message: error.message };
    }
    finally { if (conn) { conn.release() } }
  }

  async getTestQuestions(testId: number) {
    return this.qTestQuestionsFull(testId)
  }

  // Nota de forma: o retorno desta função NUNCA é serializado inteiro pro frontend — o
  // chamador (getGraphic) só usa test.id/name/period/discipline/category/person (spread
  // solto na resposta) e, de test.classrooms[].studentClassrooms[], só o que
  // cityHallResponse/readingFluencyTotalizator leem (student.readingFluency,
  // classroom.id). studentStatus/student.person, que o TypeORM carregava, nunca eram
  // usados — por isso não têm mais query própria aqui.
  async getReadingFluencyForGraphic(testId: string, yearId: string) {
    const test: any = await this.qTestByIdWithClassrooms(Number(testId))
    if (!test || String(test.period?.year?.id) !== String(yearId)) { return null }

    test.classrooms = test.classrooms
      .filter((c: any) => !OUT_CLASSROOMS.includes(c.id))
      .sort((a: any, b: any) => a.shortName.localeCompare(b.shortName))

    const classroomIds = test.classrooms.map((c: any) => c.id)

    const rows = classroomIds.length > 0
      ? await this.qReadingFluencyStudentClassrooms(Number(testId), classroomIds, Number(yearId))
      : []

    const studentClassroomsByClassroom = new Map<number, any[]>()
    const studentClassroomsById = new Map<number, any>()

    for (const row of rows) {
      let sc = studentClassroomsById.get(row.sc_id)
      if (!sc) {
        sc = {
          id: row.sc_id,
          endedAt: row.sc_endedAt,
          classroom: { id: row.sc_classroom_id },
          student: { id: row.student_id, readingFluency: [] as any[] }
        }
        studentClassroomsById.set(row.sc_id, sc)
        if (!studentClassroomsByClassroom.has(row.sc_classroom_id)) { studentClassroomsByClassroom.set(row.sc_classroom_id, []) }
        studentClassroomsByClassroom.get(row.sc_classroom_id)!.push(sc)
      }
      sc.student.readingFluency.push({
        rClassroom: row.rf_r_classroom_id != null ? { id: row.rf_r_classroom_id } : null,
        readingFluencyExam: { id: row.rf_exam_id },
        readingFluencyLevel: row.rf_level_id != null ? { id: row.rf_level_id } : null
      })
    }

    test.classrooms = test.classrooms.map((classroom: any) => {
      const raw = studentClassroomsByClassroom.get(classroom.id) || []
      const studentClassrooms = Helper.duplicatedStudents(raw).filter((el: any) => !el.ignore) as StudentClassroom[]
      return { ...classroom, studentClassrooms }
    })

    return test
  }

  async alphabeticTest(aHeaders: AlphaHeaders[], test: Test, room: Classroom, classId: number, userId: number, studentClassroomId: number | null) {

    const qTests = await this.qAlphabeticTests(test.category.id, test.discipline.id, test.period.year.name) as unknown as Test[]

    let testsMap = new Map(qTests.map(t => [t.period.bimester.id, t]));
    let headers = aHeaders.map(bi => { const test = testsMap.get(bi.id); return { ...bi, currTest: { id: test?.id, active: test?.active } } });

    // 1. Buscamos apenas os alunos (removemos o qStudentDisabilities daqui)
    let preResultSc = await this.qAlphaStudents(test, classId, test.period.year.id, studentClassroomId)

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

    // Uma chamada com todas as AVLs, não uma por AVL em paralelo: as N transações
    // concorrentes gravavam nas mesmas linhas de aluno e deadlockavam (ver qLinkAlphabetic).
    await this.qLinkAlphabetic(preResultSc, qTests.map(test => ({ test, testQuestions: test.testQuestions })), userId);

    testsMap = new Map(qTests.map(t => [t.period.bimester.id, t]));

    headers = headers.map(bi => { return {...bi, testQuestions: testsMap.get(bi.id)?.testQuestions } });

    const serieFilter = `${Number(room.shortName.replace(/\D/g, ""))}%`;

    // 2. O alphaQuestions é chamado. Ele JÁ TRAZ as deficiências junto com tudo!
    const currentResult = await this.alphaQuestions(serieFilter, test.period.year.name, test, testQuestionsIds, classId, studentClassroomId);
    preResultSc = currentResult.flatMap(school => school.classrooms.flatMap((classroom: any) => classroom.studentClassrooms));

    // ❌ O LOOP DE SOBRESCRITA QUE APAGAVA OS DADOS FOI DELETADO DAQUI!

    let studentClassrooms = preResultSc.map((el: any) => ({
      ...el,
      // 3. Garantia de Segurança: Se o Helper não achar deficiência, garante que será um array vazio para o frontend não quebrar
      student: {
        ...el.student,
        studentDisabilities: el.student.studentDisabilities || []
      },
      studentRowTotal: el.student.alphabetic.reduce((acc: number, curr: any) => acc + (curr.alphabeticLevel?.id ? 1 : 0), 0)
    }))

    const studentCount = studentClassrooms.reduce((acc: Record<number, number>, item: any) => { acc[item.student.id] = (acc[item.student.id] || 0) + 1; return acc }, {} as Record<number, number>);

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
          if (item.endedAt) { return { ...sQ, answer: 'TR', gray: true } }
          return { ...sQ, gray: true }
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

    const classroomNumber = room.shortName.replace(/\D/g, "").includes("0")
    if(classroomNumber) { room.shortName = room.name }

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
        nickname: c.nickname,
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

  podeApagarDoS3(s3Key: string): boolean {
    if (!s3Key) { return false; }
    return s3Key.startsWith('questions/') || s3Key.startsWith('tmp/');
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

  // Validação defensiva mínima de skills (Fase 3, question-skill-nn): ids inteiros
  // e existentes na tabela skill. Não substitui validação de schema — só evita
  // sincronizar question_skill com lixo. Lança HttpError(400) se algo não bater.
  private async validateSkillIds(conn: any, skillIds: number[]): Promise<{ id: number, reference: string, description: string }[]> {
    if (!Array.isArray(skillIds)) { throw new HttpError(400, "skills deve ser um array de ids.") }
    if (skillIds.length === 0) { return [] }

    const uniqueIds = [...new Set(skillIds)];
    if (!uniqueIds.every(id => Number.isInteger(id))) {
      throw new HttpError(400, "skills deve conter apenas ids inteiros.");
    }

    const [ rows ] = await conn.query(`SELECT id, reference, description FROM skill WHERE id IN (?)`, [uniqueIds]);
    const found = rows as { id: number, reference: string, description: string }[];

    if (found.length !== uniqueIds.length) {
      throw new HttpError(400, "uma ou mais habilidades informadas não existem.");
    }

    return found;
  }

  // Habilidades de uma questão NOVA. skills (number[]) tem precedência, inclusive []. Sem skills,
  // o formato antigo question.skill.id (aba antiga do navegador) cria um único vínculo; sem
  // nenhum dos dois, a questão nasce sem habilidade (estado legítimo).
  private async resolveNewQuestionSkills(conn: any, question: any): Promise<{ id: number, reference: string, description: string }[]> {
    if (Array.isArray(question.skills)) { return this.validateSkillIds(conn, question.skills) }
    if (question.skill?.id != null) { return this.validateSkillIds(conn, [question.skill.id]) }
    return [];
  }

  private isOptionLabel(value: unknown): value is QuestionOptionLabel {
    return typeof value === 'string' && (QUESTION_OPTION_LABELS as readonly string[]).includes(value);
  }

  private validateQuestionOptions(question: { title?: unknown, options?: unknown }): ValidatedQuestionOption[] {
    const options = question.options;
    if (!Array.isArray(options)) { throw new HttpError(400, "options deve ser um array.") }
    if (options.length !== QUESTION_OPTIONS_COUNT) { throw new HttpError(400, `A questão deve ter exatamente ${QUESTION_OPTIONS_COUNT} alternativas.`) }
    if (typeof question.title === 'string' && question.title.length > QUESTION_TITLE_MAX_LENGTH) {
      throw new HttpError(400, `O título da questão deve ter no máximo ${QUESTION_TITLE_MAX_LENGTH} caracteres.`);
    }

    const labels = new Set<QuestionOptionLabel>();
    const orders = new Set<number>();

    return options.map((option: unknown): ValidatedQuestionOption => {
      if (typeof option !== 'object' || option === null) { throw new HttpError(400, "Alternativa inválida.") }
      const { label, text, order } = option as { label?: unknown, text?: unknown, order?: unknown };

      if (!this.isOptionLabel(label)) { throw new HttpError(400, `Rótulo de alternativa inválido. Use: ${QUESTION_OPTION_LABELS.join(', ')}.`) }
      if (labels.has(label)) { throw new HttpError(400, "Rótulos de alternativas não podem se repetir.") }
      if (typeof order !== 'number' || !Number.isInteger(order)) { throw new HttpError(400, "A ordem da alternativa deve ser um número inteiro.") }
      if (orders.has(order)) { throw new HttpError(400, "Ordens de alternativas não podem se repetir.") }
      if (typeof text !== 'string') { throw new HttpError(400, "O texto da alternativa deve ser uma string.") }

      const trimmed = text.trim();
      if (trimmed.length < 1 || trimmed.length > QUESTION_OPTION_TEXT_MAX_LENGTH) {
        throw new HttpError(400, `O texto da alternativa deve ter entre 1 e ${QUESTION_OPTION_TEXT_MAX_LENGTH} caracteres.`);
      }

      labels.add(label);
      orders.add(order);
      return { label, text: trimmed, order };
    });
  }

  private resolveImagePosition(position: unknown): QuestionImagePosition {
    if (position === undefined || position === null) { return QuestionImagePosition.BEFORE }
    if (position === QuestionImagePosition.BEFORE || position === QuestionImagePosition.AFTER) { return position }
    throw new HttpError(400, "Posição de imagem inválida. Use 'before' ou 'after'.");
  }

  private resolveImagePositions(images: unknown): QuestionImagePosition[] {
    if (!Array.isArray(images)) { return [] }
    return images.map((img: unknown) => this.resolveImagePosition((img as { position?: unknown } | null)?.position));
  }

  private assertAnswerMatchesOptions(answer: unknown): void {
    const normalized = String(answer ?? '').trim().toUpperCase();
    if (normalized === '') { return }
    if ([...normalized].every(char => this.isOptionLabel(char))) { return }
    throw new HttpError(400, `Resposta inválida para questão com alternativas. Use apenas: ${QUESTION_OPTION_LABELS.join(', ')}.`);
  }

  private isSharedQuestion(curr: TestQuestionFull): boolean {
    return (((curr.question as any)?.inUse ?? 0) as number) >= 1;
  }

  private prepareNewQuestion(tq: NewQuestionInput): PreparedNewQuestion | null {
    const question = tq.question;
    if (question.id) { return null }

    const imagePositions = this.resolveImagePositions(question.images);
    const sent = Array.isArray(question.options) ? question.options.length > 0 : question.options != null;
    const options = sent ? this.validateQuestionOptions(question) : [];
    if (options.length > 0) { this.assertAnswerMatchesOptions(tq.answer) }

    return { options, imagePositions };
  }

  private async prepareExistingQuestionOptions(conn: any, curr: TestQuestionFull, next: any): Promise<ExistingOptionsPlan | null> {
    if (!Array.isArray(next.question?.options)) { return null }

    const isShared = this.isSharedQuestion(curr);
    const [ rowsResult ] = isShared
      ? await conn.query(`SELECT id, label, \`text\`, \`order\` FROM question_option WHERE questionId = ? AND active = 1`, [curr.question.id])
      : await conn.query(`SELECT id, label, \`text\`, \`order\` FROM question_option WHERE questionId = ? FOR UPDATE`, [curr.question.id]);
    const rows = rowsResult as QuestionOptionRow[];

    if (rows.length === 0) { return { rows, validated: [] } }

    const validated = isShared ? [] : this.validateQuestionOptions(next.question);
    this.assertAnswerMatchesOptions(next.answer);

    return { rows, validated };
  }

  private optionsDiffer(payload: unknown[], rows: QuestionOptionRow[]): boolean {
    const keyOf = (label: unknown, text: unknown, order: unknown): string => JSON.stringify([String(label), String(text).trim(), Number(order)]);
    const payloadKeys = payload.map(option => {
      const { label, text, order } = (option ?? {}) as { label?: unknown, text?: unknown, order?: unknown };
      return keyOf(label, text, order);
    }).sort();
    const rowKeys = rows.map(row => keyOf(row.label, row.text, row.order)).sort();

    return payloadKeys.length !== rowKeys.length || payloadKeys.some((key, index) => key !== rowKeys[index]);
  }

  private async insertQuestionOptions(conn: any, questionId: number, options: ValidatedQuestionOption[], createdAt: Date, userId: number): Promise<void> {
    if (options.length === 0) { return }
    const values = options.map(o => [questionId, o.label, o.text, o.order, createdAt, userId]);
    await conn.query(`INSERT INTO question_option (questionId, label, \`text\`, \`order\`, createdAt, createdByUser) VALUES ?`, [values]);
  }

  private async syncQuestionOptions(conn: any, questionId: number, plan: ExistingOptionsPlan, now: Date, userId: number): Promise<void> {
    const { rows, validated } = plan;
    const rowByLabel = new Map(rows.map(row => [row.label, row]));
    const nextLabels = new Set<string>(validated.map(o => o.label));

    const idsToDelete = rows.filter(row => !nextLabels.has(row.label)).map(row => row.id);
    if (idsToDelete.length > 0) {
      await conn.query(`DELETE FROM question_option WHERE id IN (?)`, [idsToDelete]);
    }

    for (const option of validated) {
      const existing = rowByLabel.get(option.label);
      if (!existing) continue;
      if (existing.text === option.text && existing.order === option.order) continue;
      await conn.query(
        `UPDATE question_option SET \`text\` = ?, \`order\` = ?, updatedAt = ?, updatedByUser = ? WHERE id = ?`,
        [option.text, option.order, now, userId, existing.id]
      );
    }

    await this.insertQuestionOptions(conn, questionId, validated.filter(o => !rowByLabel.has(o.label)), now, userId);
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

  diffsStrict = (stored: any, incoming: any, ignoreKeys: string[] = []): boolean => {

    if (Object.is(stored, incoming)) return false;

    // um dos lados é null/undefined e o outro não
    if (stored == null || incoming == null) return true;

    if (stored instanceof Date || incoming instanceof Date) {
      const a = stored instanceof Date ? stored.getTime() : new Date(stored).getTime();
      const b = incoming instanceof Date ? incoming.getTime() : new Date(incoming).getTime();
      return a !== b;
    }

    // pelo menos um é primitivo e já sabemos que não são iguais
    if (typeof stored !== 'object' || typeof incoming !== 'object') return true;

    if (Array.isArray(stored) || Array.isArray(incoming)) {
      if (!Array.isArray(stored) || !Array.isArray(incoming)) return true;
      if (stored.length !== incoming.length) return true;
      for (let i = 0; i < stored.length; i++) {
        if (this.diffsStrict(stored[i], incoming[i], ignoreKeys)) return true;
      }
      return false;
    }

    // percorre apenas o que o cliente enviou
    for (const key of Object.keys(incoming)) {
      if (ignoreKeys.includes(key)) continue;
      if (incoming[key] === undefined) continue;
      if (this.diffsStrict(stored[key], incoming[key], ignoreKeys)) return true;
    }

    return false;
  }
}

// @ts-ignore
export const testController = new TestController();

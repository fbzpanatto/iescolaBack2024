import { GenericController } from "./genericController";
import { Test } from "../model/Test";
import { classroomController } from "./classroom";
import { Classroom } from "../model/Classroom";
import { StudentClassroom } from "../model/StudentClassroom";
import { TestQuestion } from "../model/TestQuestion";
import { Request } from "express";
import {EXAMS_IDS_PRODUCTION, EXAMS_IDS_READING, OUT_CLASSROOMS, PER_CAT, TEST_CATEGORIES_IDS as tcids} from "../utils/enums";
import { EntityTarget } from "typeorm";
import { ReadingFluency } from "../model/ReadingFluency";
import { AlphaHeaders, Totals, JwtPayload } from "../interfaces/interfaces";
import { teacherRepository } from "../repositories/teacher.repository";
import { classroomRepository } from "../repositories/classroom.repository";
import { studentRepository } from "../repositories/student.repository";
import { testRepository } from "../repositories/test.repository";
import { testQuestionRepository } from "../repositories/test-question.repository";
import { studentTestStatusRepository } from "../repositories/student-test-status.repository";
import { studentTestRepository } from "../repositories/student-test.repository";
import { readingFluencyRepository } from "../repositories/reading-fluency.repository";
import { alphabeticRepository } from "../repositories/alphabetic.repository";
import { readingFluencyLinkRepository } from "../repositories/reading-fluency-link.repository";
import { alphabeticReportRepository } from "../repositories/alphabetic-report.repository";
import { testAccessService } from "../services/test-access.service";
import { TestFormatter } from "../utils/formatters/test.formatter";
import { TestReportFormatter } from "../utils/formatters/test-report.formatter";
import { ReadingFluencyFormatter } from "../utils/formatters/reading-fluency.formatter";

class TestController extends GenericController<EntityTarget<Test>> {

  constructor() { super(Test) }

  async getStudents(req: Request, authUser: JwtPayload) {
    if (authUser.category === PER_CAT.ALUN) { return { status: 403, message: "Você não tem permissão para acessar este recurso." } }

    const testId = Number(req?.params.id)
    const classroomId = Number(req?.params.classroom);
    const scId = Number(req?.query.stc);
    const isHistory = Boolean(req?.query.isHistory);

    try {

      const testClassroom = await testRepository.qTestClassroom(testId, classroomId)
      if(!testClassroom) { return { status: 404, message: 'Esse teste não existe para a sala em questão.' } }

      const tUser = await teacherRepository.qUser(authUser.user)
      const masterUser = tUser?.categoryId === PER_CAT.ADMN || tUser?.categoryId === PER_CAT.SUPE || tUser?.categoryId === PER_CAT.SUPE_EI || tUser?.categoryId === PER_CAT.FORM;

      const { classrooms } = await teacherRepository.qTeacherClassrooms(Number(authUser.user))
      if(!classrooms?.includes(classroomId) && !masterUser && !isHistory) { return { status: 403, message: "Você não tem permissão para acessar essa sala." } }

      const qTest = await testRepository.qTestByIdAndYear(testId, String(req?.params.year))
      if(!qTest) return { status: 404, message: "Teste não encontrado" }
      const test = TestFormatter.testFormater(qTest)

      const classroom = await classroomRepository.qClassroom(classroomId)
      if(!classroom) return { status: 404, message: "Sala não encontrada" }

      let data: any = {}

      const alphabeticCategories = [tcids.LITE_1, tcids.LITE_2, tcids.LITE_3, tcids.EDU_INF, tcids.EDU_INF_PART]

      if(alphabeticCategories.includes(test.category.id)) {
        const headers = await alphabeticRepository.qAlphabeticHeaders(test.period.year.name) as unknown as AlphaHeaders[]
        data = await this.alphabeticTest(headers, test, classroom, classroomId, tUser?.userId as number, isNaN(scId) ? null : Number(scId))
        return { status: 200, data: data };
      }

      if(TestReportFormatter.isScoredTestCategory(test.category.id)) {

        await studentTestStatusRepository.findAndDeleteStatusAndQuestions(testId, classroomId)

        await studentTestStatusRepository.updateStudentTestStatus(testId, classroomId, test.period.year.name, tUser?.userId as number);

        const qTestQuestions = await testQuestionRepository.qTestQuestions(test.id) as unknown as TestQuestion[]

        const questionGroups = await testQuestionRepository.qTestQuestionsGroupsOnReport(testId)

        let classroomPoints = 0
        let classroomPercent = 0
        let validStudentsTotalizator = 0
        // Denominador legado por questão (só células com sala vinculada): base do % por letra, que não muda.
        const lettersTotals = new Map<number, number>()
        let totals: Totals[] = qTestQuestions.map(el => ({ id: el.id, tNumber: 0, tTotal: 0, tRate: 0 }))
        let answersLetters: { letter: string, questions: {  id: number, order: number, occurrences: number, percentage: number }[] }[] = []

        const qStudentsClassroom = await studentTestRepository.qStudentClassroomsForTest(test, classroomId, test.period.year.name, isNaN(scId) ? null : Number(scId))

        await studentTestStatusRepository.unifiedTestQuestLinkSql(true, qStudentsClassroom, test, qTestQuestions, tUser?.userId as number)

        let diffOe = 0
        let validSc = 0

        let result = await studentTestRepository.getStudentsQuestionsSql(test, qTestQuestions, Number(classroomId), test.period.year.name, isNaN(scId) ? null : Number(scId)) as any[]

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
            if(TestReportFormatter.isUnassignedEmptyCell(studentQuestion)) {
              element!.tTotal += 1
              classroomPercent += 1
              element!.tRate = TestReportFormatter.scoreRate(element!.tNumber, element!.tTotal)
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
            element!.tRate = TestReportFormatter.scoreRate(element!.tNumber, element!.tTotal)

            const letter = studentQuestion?.answer && studentQuestion.answer.trim().length ? studentQuestion.answer.toUpperCase().trim() : 'VAZIO';

            let ltItem = answersLetters.find(el => el.letter === letter)
            if(!ltItem) { ltItem = { letter, questions: [] }; answersLetters.push(ltItem) }

            let ltQ = ltItem.questions.find(tQ => tQ.id === testQuestion.id)
            if(!ltQ) { ltQ = { id: testQuestion.id, order: testQuestion.order, occurrences: 0, percentage: 0 }; ltItem.questions.push(ltQ) }

            ltQ.occurrences += 1

            answersLetters = answersLetters.map(el => ({...el, questions: el.questions.map(it => ({...it, percentage: TestReportFormatter.scoreRate(it.occurrences, lettersTotals.get(testQuestion.id)!)}))})).sort((a, b) => a.letter.localeCompare(b.letter))

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
          classroomPercent: TestReportFormatter.scoreRate(classroomPoints, classroomPercent)
        }

        return { status: 200, data: data };
      }

      if([tcids.READ_2, tcids.READ_3, tcids.PRO_TXT].includes(test.category.id)) {

        const examIds = tcids.PRO_TXT === test.category.id ? EXAMS_IDS_PRODUCTION : EXAMS_IDS_READING

        await readingFluencyRepository.findAndDeleteStatusAndReadingFluency(testId, classroomId)

        await readingFluencyRepository.updateReadingFluencyStatus(testId, classroomId, test.period.year.name, tUser?.userId as number);

        const headers = await readingFluencyRepository.qReadingFluencyHeaders(examIds)
        const fluencyHeaders = ReadingFluencyFormatter.readingFluencyHeaders(headers)

        const preStudents = await readingFluencyLinkRepository.stuClassReadFSql(test, Number(classroomId), test.period.year.name, isNaN(scId) ? null : Number(scId))

        await readingFluencyLinkRepository.linkReadingSql(headers, preStudents, test, tUser?.userId as number, classroomId, test.period.year.name)

        let studentClassrooms = await readingFluencyLinkRepository.getReadingFluencyStudentsSql(test, classroomId, test.period.year.name, isNaN(scId) ? null : Number(scId))

        studentClassrooms = await studentRepository.qStudentDisabilities(studentClassrooms) as unknown as StudentClassroom[]

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

  async getFormData(_: Request, authUser: JwtPayload) {
    try {
      const { disciplines, bimesters, testCategories, questionGroup } = await testRepository.qTestFormData()
      const allowedCategories = testAccessService.isRestrictedCreator(authUser)
        ? (testCategories as Array<{ id: number }>).filter((el) => testAccessService.isCategoryAllowedForRestricted(el.id))
        : testCategories
      return { status: 200, data: { disciplines, bimesters, testCategories: allowedCategories, questionGroup } };
    } catch (error: any) { return { status: 500, message: error.message } }
  }

  async getFormDataByTestCategory(req: Request, authUser: JwtPayload) {
    if (authUser.category === PER_CAT.ALUN) { return { status: 403, message: "Você não tem permissão para acessar este recurso." } }
    try {
      let classrooms = ((await classroomController.getAllClassroomsByTestCategory(req, authUser)).data) as Array<{ id: number, name: string, school: string }>;
      classrooms = classrooms?.filter((el: any) => !OUT_CLASSROOMS.includes(el.id))
      return { status: 200, data: classrooms };
    } catch (error: any) { return { status: 500, message: error.message } }
  }

  async alphabeticTest(aHeaders: AlphaHeaders[], test: Test, room: Classroom, classId: number, userId: number, studentClassroomId: number | null) {

    const qTests = await alphabeticRepository.qAlphabeticTests(test.category.id, test.discipline.id, test.period.year.name) as unknown as Test[]

    let testsMap = new Map(qTests.map(t => [t.period.bimester.id, t]));
    let headers = aHeaders.map(bi => { const test = testsMap.get(bi.id); return { ...bi, currTest: { id: test?.id, active: test?.active } } });

    // 1. Buscamos apenas os alunos (removemos o qStudentDisabilities daqui)
    let preResultSc = await alphabeticReportRepository.qAlphaStudents(test, classId, test.period.year.id, studentClassroomId)

    const allQuestionsRaw = await testQuestionRepository.bactchQueryAlphaQuestions(qTests.map(t => t.id)) as any

    const questionsByTestId = new Map<number, any[]>();

    allQuestionsRaw.forEach((q: any) => {
      const testId = q.test_id;
      if (!questionsByTestId.has(testId)) { questionsByTestId.set(testId, []) }
      questionsByTestId.get(testId)!.push(q);
    });

    let testQuestionsIds: number[] = [];

    for (let test of qTests) {
      const rawQuestions = questionsByTestId.get(test.id) || [];
      const testQuestions = TestFormatter.testQuestions(rawQuestions) as unknown as TestQuestion[];

      test.testQuestions = testQuestions;
      testQuestionsIds = [ ...testQuestionsIds, ...testQuestions.map(testQuestion => testQuestion.id) ];
    }

    // Uma chamada com todas as AVLs, não uma por AVL em paralelo: as N transações
    // concorrentes gravavam nas mesmas linhas de aluno e deadlockavam (ver qLinkAlphabetic).
    await alphabeticRepository.qLinkAlphabetic(preResultSc, qTests.map(test => ({ test, testQuestions: test.testQuestions })), userId);

    testsMap = new Map(qTests.map(t => [t.period.bimester.id, t]));

    headers = headers.map(bi => { return {...bi, testQuestions: testsMap.get(bi.id)?.testQuestions } });

    const serieFilter = `${Number(room.shortName.replace(/\D/g, ""))}%`;

    // 2. O alphaQuestions é chamado. Ele JÁ TRAZ as deficiências junto com tudo!
    const currentResult = await alphabeticReportRepository.alphaQuestions(serieFilter, test.period.year.name, test, testQuestionsIds, classId, studentClassroomId);
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
}

// @ts-ignore
export const testController = new TestController();

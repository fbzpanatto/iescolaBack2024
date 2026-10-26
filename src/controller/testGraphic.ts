import { GenericController } from "./genericController";
import { Test } from "../model/Test";
import { Classroom } from "../model/Classroom";
import { StudentClassroom } from "../model/StudentClassroom";
import { TestQuestion } from "../model/TestQuestion";
import { Request } from "express";
import { EXAMS_IDS_PRODUCTION, EXAMS_IDS_READING, OUT_CLASSROOMS, PER_CAT, TEST_CATEGORIES_IDS as tcids } from "../utils/enums";
import { EntityTarget } from "typeorm";
import { qYear, JwtPayload } from "../interfaces/interfaces";
import { reportController } from "./report";
import { yearRepository } from "../repositories/year.repository";
import { teacherRepository } from "../repositories/teacher.repository";
import { classroomRepository } from "../repositories/classroom.repository";
import { testRepository } from "../repositories/test.repository";
import { testQuestionRepository } from "../repositories/test-question.repository";
import { readingFluencyRepository } from "../repositories/reading-fluency.repository";
import { alphabeticRepository } from "../repositories/alphabetic.repository";
import { alphabeticReportRepository } from "../repositories/alphabetic-report.repository";
import { testTotalsService } from "../services/test-totals.service";
import { TestFormatter } from "../utils/formatters/test.formatter";
import { TestReportFormatter } from "../utils/formatters/test-report.formatter";
import { ReadingFluencyFormatter } from "../utils/formatters/reading-fluency.formatter";
import { StudentFormatter } from "../utils/formatters/student.formatter";

class TestGraphicController extends GenericController<EntityTarget<Test>> {

  constructor() { super(Test) }

  async getGroupedFullParallel(req: Request, authUser: JwtPayload) {
    if (authUser.category === PER_CAT.ALUN) { return { status: 403, message: "Você não tem permissão para acessar este recurso." } }

    const classroom = req.query.classroom ?? req.params.classroom
    const bimester = req.query.bimester ?? req.params.bimester
    const year = req.query.year ?? req.params.year

    try {
      const qUt = await teacherRepository.qTeacherByUser(authUser.user)
      const masterUser = qUt.person.category.id === PER_CAT.ADMN || qUt.person.category.id === PER_CAT.SUPE || qUt.person.category.id === PER_CAT.FORM

      const qClassroom = await classroomRepository.qClassroom(Number(classroom))
      if (!qClassroom) return { status: 404, message: "Sala não encontrada" }

      const { classrooms } = await teacherRepository.qTeacherClassrooms(authUser.user)
      if(!classrooms.includes(qClassroom.id) && !masterUser) { return { status: 403, message: "Você não tem permissão para acessar essa sala." } }

      const qYear = await yearRepository.qYearByName(String(year))
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

    const qTestQuestions = await testQuestionRepository.qTestQuestions(test.id) as unknown as TestQuestion[];
    if (!qTestQuestions) return { status: 404, message: "Questões não encontradas" };

    const testQuestionsIds = qTestQuestions.map(tq => tq.id);
    const questionGroups = await testQuestionRepository.qTestQuestionsGroupsOnReport(test.id);

    const classroomNumber = qClassroom.shortName.replace(/\D/g, "");
    const baseSchoolId = qClassroom.school.id;

    const pResult = TestReportFormatter.testGraph((await testRepository.qGraphTest(test.id, testQuestionsIds, year)) as Array<any>);

    if (!pResult || pResult.length === 0) { return { status: 200, data: [] } }

    return { status: 200, data: TestReportFormatter.classroomDataStructure(pResult, test, questionGroups, qTestQuestions, baseSchoolId, classroomNumber) };
  }

  async getGraphic(req: Request<{ id: string, classroom: string }>, authUser: JwtPayload) {
    if (authUser.category === PER_CAT.ALUN) { return { status: 403, message: "Você não tem permissão para acessar este recurso." } }

    const { id: testId, classroom: classroomId } = req.params

    try {

      const year = await yearRepository.qYearByName(String(req.query?.year))
      if(!year) return { status: 404, message: "Ano não encontrado." }

      const qUt = await teacherRepository.qTeacherByUser(authUser.user)

      const masterUser = qUt.person.category.id === PER_CAT.ADMN || qUt.person.category.id === PER_CAT.SUPE || qUt.person.category.id === PER_CAT.SUPE_EI || qUt.person.category.id === PER_CAT.FORM

      const baseTest = TestFormatter.testFormater(await testRepository.qTestByIdAndYear(Number(testId), year.name))

      const { classrooms } = await teacherRepository.qTeacherClassrooms(authUser.user)

      if(!classrooms.includes(Number(classroomId)) && !masterUser) { return { status: 403, message: "Você não tem permissão para acessar essa sala." } }

      const qClassroom = await classroomRepository.qClassroom(Number(classroomId))
      if (!qClassroom) return { status: 404, message: "Sala não encontrada" }

      const serieFilter = `${Number(qClassroom.shortName.replace(/\D/g, ""))}%`;

      if([tcids.EDU_INF, tcids.LITE_1, tcids.LITE_2, tcids.LITE_3, tcids.EDU_INF_PART].includes(baseTest.category.id)) {

        const [preheaders, tests] = await Promise.all([
          alphabeticRepository.qAlphabeticHeaders(year.name) as Promise<any[]>,
          alphabeticRepository.qAlphabeticTests(baseTest.category.id, baseTest.discipline.id, year.name) as Promise<any[]>
        ])

        let testQuestionsIds: number[] = []

        if((baseTest.category?.id != tcids.LITE_1 && baseTest.category?.id != tcids.EDU_INF && baseTest.category?.id != tcids.EDU_INF_PART) && tests.length > 0) {
          const testQuestionsArr = await Promise.all(tests.map(test => testQuestionRepository.qTestQuestions(test.id)))

          for(let i = 0; i < tests.length; i++) { tests[i].testQuestions = testQuestionsArr[i]; testQuestionsIds.push(...tests[i].testQuestions.map((tq: any) => tq.id)) }
        }

        const testsByBimesterId = new Map()
        for(const test of tests) { const bimesterId = test.period?.bimester?.id; if(bimesterId) { testsByBimesterId.set(bimesterId, test) } }

        let headers = preheaders.map((bi: any) => { return { ...bi, testQuestions: testsByBimesterId.get(bi.id)?.testQuestions || [] } })

        const schools = await alphabeticReportRepository.alphaQuestions(serieFilter, year.name, baseTest, testQuestionsIds)
        const onlyClasses = schools
          .flatMap((school: any) => school.classrooms)
          .sort((a: any, b: any) => a.shortName.localeCompare(b.shortName))

        const cityHall = { id: 999, name: 'ITATIBA', shortName: 'ITA', school: 'ITATIBA', totals: headers.map((h: any) => ({ ...h, bimesterCounter: 0 })) }

        let allClassrooms = testTotalsService.alphabeticTotalizators(onlyClasses, headers)

        cityHall.totals = testTotalsService.aggregateResult(cityHall, allClassrooms)

        const schoolId = qClassroom?.school?.id
        const resClassrooms = schoolId ? [...allClassrooms.filter((c: any) => c.school?.id === schoolId), cityHall] : [cityHall]

        const test = { id: 99, name: baseTest.name, classrooms: [qClassroom], category: { id: baseTest.category.id, name: baseTest.category.name }, discipline: { name: baseTest.discipline.name }, period: { bimester: { name: 'TODOS' }, year }}

        return { status: 200, data: { alphabeticHeaders: headers, ...test, classrooms: resClassrooms } };
      }

      if(TestReportFormatter.isScoredTestCategory(baseTest.category.id)) {
        const qTestQuestions = await testQuestionRepository.qTestQuestions(testId) as unknown as TestQuestion[];
        if (!qTestQuestions) return { status: 404, message: "Questões não encontradas" };

        const testQuestionsIds = qTestQuestions.map(tq => tq.id);
        const questionGroups = await testQuestionRepository.qTestQuestionsGroupsOnReport(Number(testId));

        const classroomNumber = qClassroom.shortName.replace(/\D/g, "");
        const baseSchoolId = qClassroom.school.id;

        const pResult = TestReportFormatter.testGraph((await testRepository.qGraphTest(testId, testQuestionsIds, year)) as Array<any>);

        return { status: 200, data: TestReportFormatter.classroomDataStructure(pResult, baseTest, questionGroups, qTestQuestions, baseSchoolId, classroomNumber) };
      }

      let data;

      switch (baseTest.category?.id) {
        case tcids.PRO_TXT:
        case tcids.READ_2:
        case tcids.READ_3: {

          const examIds = tcids.PRO_TXT === baseTest.category?.id ? EXAMS_IDS_PRODUCTION : EXAMS_IDS_READING

          const [headers, test] = await Promise.all([
            readingFluencyRepository.qReadingFluencyHeaders(examIds),
            this.getReadingFluencyForGraphic(testId, String(year.id)) as Promise<Test>
          ])

          const fluencyHeaders = ReadingFluencyFormatter.readingFluencyHeaders(headers)

          let response = { ...test, fluencyHeaders }

          response.classrooms = testTotalsService.cityHallResponse(qClassroom, response.classrooms)

          data = {
            ...response,
            classrooms: response.classrooms.map((classroom: Classroom) => {
              return {
                id: classroom.id,
                name: classroom.name,
                shortName: classroom.shortName,
                school: classroom.school,
                percent: testTotalsService.readingFluencyTotalizator(headers, classroom)
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

  // Nota de forma: o retorno desta função NUNCA é serializado inteiro pro frontend — o
  // chamador (getGraphic) só usa test.id/name/period/discipline/category/person (spread
  // solto na resposta) e, de test.classrooms[].studentClassrooms[], só o que
  // cityHallResponse/readingFluencyTotalizator leem (student.readingFluency,
  // classroom.id). studentStatus/student.person, que o TypeORM carregava, nunca eram
  // usados — por isso não têm mais query própria aqui.
  async getReadingFluencyForGraphic(testId: string, yearId: string) {
    const test: any = await testRepository.qTestByIdWithClassrooms(Number(testId))
    if (!test || String(test.period?.year?.id) !== String(yearId)) { return null }

    test.classrooms = test.classrooms
      .filter((c: any) => !OUT_CLASSROOMS.includes(c.id))
      .sort((a: any, b: any) => a.shortName.localeCompare(b.shortName))

    const classroomIds = test.classrooms.map((c: any) => c.id)

    const rows = classroomIds.length > 0
      ? await readingFluencyRepository.qReadingFluencyStudentClassrooms(Number(testId), classroomIds, Number(yearId))
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
      const studentClassrooms = StudentFormatter.duplicatedStudents(raw).filter((el: any) => !el.ignore) as StudentClassroom[]
      return { ...classroom, studentClassrooms }
    })

    return test
  }
}

export const testGraphicController = new TestGraphicController();

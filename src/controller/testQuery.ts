import { GenericController } from "./genericController";
import { Test } from "../model/Test";
import { Request } from "express";
import { PER_CAT as pc, PER_CAT, TEST_CATEGORIES_IDS as tcids } from "../utils/enums";
import { EntityTarget } from "typeorm";
import { JwtPayload, TestPreviewGroup, TestPreviewResponse, TestQuestionWithImages } from "../interfaces/interfaces";
import { Helper } from "../utils/helpers";
import { yearRepository } from "../repositories/year.repository";
import { teacherRepository } from "../repositories/teacher.repository";
import { testRepository } from "../repositories/test.repository";
import { testListingRepository } from "../repositories/test-listing.repository";
import { testQuestionRepository } from "../repositories/test-question.repository";
import { testQuestionService } from "../services/test-question.service";
import { testAccessService } from "../services/test-access.service";

class TestQueryController extends GenericController<EntityTarget<Test>> {

  constructor() { super(Test) }

  async findAllByYear(req: Request<{ year: string }>, authUser: JwtPayload) {
    if (authUser.category === PER_CAT.ALUN) { return { status: 403, message: "Você não tem permissão para acessar este recurso." } }

    try {
      const bimesterId = !isNaN(parseInt(req.query.bimester as string)) ? parseInt(req.query.bimester as string) : null;
      const disciplineId = !isNaN(parseInt(req.query.discipline as string)) ? parseInt(req.query.discipline as string) : null;
      const search = req.query.search as string || '';
      const limit = !isNaN(parseInt(req.query.limit as string)) ? parseInt(req.query.limit as string) : 100;
      const offset = !isNaN(parseInt(req.query.offset as string)) ? parseInt(req.query.offset as string) : 0;

      let yearName = req.params.year;

      if (yearName.length != 4) { const currentYear = await yearRepository.qCurrentYear(); yearName = currentYear.name }

      const qUserTeacher = await teacherRepository.qTeacherByUser(authUser.user);

      const masterTeacher =
        qUserTeacher.person.category.id === PER_CAT.ADMN ||
        qUserTeacher.person.category.id === PER_CAT.SUPE ||
        qUserTeacher.person.category.id === PER_CAT.SUPE_EI ||
        qUserTeacher.person.category.id === PER_CAT.FORM;

      const isSuperEI = qUserTeacher.person.category.id === pc.SUPE_EI

      const { classrooms } = await teacherRepository.qTeacherClassrooms(authUser.user);
      const { disciplines } = await teacherRepository.qTeacherDisciplines(authUser.user);

      const testsMap = new Map<number, any>();

      const rows = await testListingRepository.qfindAllByYearNewImplementation(
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
      const qUserTeacher = await teacherRepository.qTeacherByUser(authUser.user)
      const masterUser = qUserTeacher.person.category.id === PER_CAT.ADMN || qUserTeacher.person.category.id === PER_CAT.SUPE || qUserTeacher.person.category.id === PER_CAT.FORM;

      const test = await testRepository.qTestByIdWithClassrooms(parseInt(id))
      if(qUserTeacher.person.id !== test?.person!.id && !masterUser) return { status: 403, message: "Você não tem permissão para editar esse teste." }
      if (!test) { return { status: 404, message: 'Data not found' } }

      let formatedEndedAt;

      if(test.endedAt) { formatedEndedAt = Helper.formatDateToDDMMYYYY(test.endedAt) }

      const testQuestions = await testQuestionService.getTestQuestions(test.id)
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

      const qUserTeacher = await teacherRepository.qTeacherByUser(authUser.user)
      const categoryId = qUserTeacher.person.category.id
      if (categoryId === PER_CAT.ALUN) { return forbidden }

      const scope = await testRepository.qTestPreviewScope(testId)
      if (!scope) { return { status: 404, message: "Prova não encontrada." } }

      const qTest = await testRepository.qTestByIdAndYear(testId, scope.yearName)
      if (!qTest) { return { status: 404, message: "Prova não encontrada." } }

      if (qTest.test_category_id !== tcids.SIM_ITA) { return { status: 400, message: "A pré-visualização está disponível apenas para simulados." } }

      const canView = await testAccessService.canPreviewTest(authUser.user, categoryId, qUserTeacher.person.id === qTest.person_id, qTest.discipline_id, scope.classrooms)
      if (!canView) { return forbidden }

      const qTqs = await testQuestionRepository.qTestQuestionsWithTitle(testId) as TestQuestionWithImages[]
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
}

export const testQueryController = new TestQueryController();

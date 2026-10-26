import { GenericController } from "./genericController";
import { Test } from "../model/Test";
import { PER_CAT, TEST_CATEGORIES_IDS as tcids } from "../utils/enums";
import { EntityTarget } from "typeorm";
import { TestBodySave, JwtPayload } from "../interfaces/interfaces";
import { Helper } from "../utils/helpers";
import { moverParaQuestions } from "../services/s3.service";
import { QuestionImagePosition, QuestionImageType } from "../model/QuestionImage";
import { HttpError } from "../utils/helpers";
import { connectionPool } from "../services/db";
import { teacherRepository } from "../repositories/teacher.repository";
import { testQuestionService, PreparedNewQuestion, ReusedResolution } from "../services/test-question.service";
import { testAccessService } from "../services/test-access.service";

class TestCreateController extends GenericController<EntityTarget<Test>> {

  constructor() { super(Test) }

  async saveTest(body: TestBodySave, authUser: JwtPayload) {
    const classesIds = body.classroom.map((classroom: { id: number }) => classroom.id);
    let conn;
    try {
      conn = await connectionPool.getConnection();
      await conn.beginTransaction();

      if (testAccessService.isRestrictedCreator(authUser) && !testAccessService.isCategoryAllowedForRestricted(body.category?.id)) {
        throw new HttpError(403, 'Seu perfil só pode criar avaliações das categorias Simulado e Avaliação ITA.');
      }

      const qUserTeacher = await teacherRepository.qTeacherByUser(authUser.user);

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
      const reusedQuestions = new Map<object, ReusedResolution>();
      if (haveQuestions.includes(body.category.id) && body.testQuestions?.length) {
        for (const tq of body.testQuestions) {
          const prepared = testQuestionService.prepareNewQuestion(tq);
          if (prepared) { preparedQuestions.set(tq, prepared); continue }
          if (tq.question?.id) { reusedQuestions.set(tq, await testQuestionService.resolveReusedQuestion(conn, Number(tq.question.id), tq)) }
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
            const validatedSkills = await testQuestionService.resolveNewQuestionSkills(conn, question);
            const prepared = preparedQuestions.get(tq);

            const [ insertQuestionResult ]: any = await conn.query(
              `INSERT INTO question (title, personId, disciplineId, classroomNumber, classroomCategoryId, correctLabel, createdAt, createdByUser) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
              [question.title, question.person?.id || qUserTeacher.person.id, body.discipline.id, classroomNumber, question.classroomCategory.id, prepared?.correctLabel ?? null, createdAt, qUserTeacher.person.user.id]
            );
            const newQuestionId = insertQuestionResult.insertId;

            if (validatedSkills.length > 0) {
              const questionSkillValues = validatedSkills.map(s => [newQuestionId, s.id, createdAt, qUserTeacher.person.user.id]);
              await conn.query(`INSERT INTO question_skill (questionId, skillId, createdAt, createdByUser) VALUES ?`, [questionSkillValues]);
            }

            await testQuestionService.insertQuestionOptions(conn, newQuestionId, prepared?.options ?? [], createdAt, qUserTeacher.person.user.id);

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

          const reused = reusedQuestions.get(tq);
          const answerToSave = reused ? reused.answer : (preparedQuestions.get(tq)?.correctLabel ?? tq.answer);
          testQuestionValues.push([tq.order, answerToSave, tq.questionGroup.id, tq.active, question.id, testId, reused?.optionsOrder ?? null, createdAt, qUserTeacher.person.user.id]);
        }

        await conn.query(`INSERT INTO test_question (\`order\`, answer, questionGroupId, active, questionId, testId, optionsOrder, createdAt, createdByUser) VALUES ?`, [testQuestionValues]);
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
}

export const testCreateController = new TestCreateController();

import { qTestQuestions, qTestQuestionsFull, qTestQuestionsWithImages } from "../interfaces/interfaces";
import { connectionPool } from "../services/db";
import { TestFormatter } from "../utils/formatters/test.formatter";

class TestQuestionRepository {

  async qTestQuestionsForMultipleTests(testIds: number[]) {
    if (!testIds || testIds.length === 0) { return new Map() }
    let conn;
    try {
      conn = await connectionPool.getConnection();
      const query =
        `
            SELECT
                tq.id AS test_question_id,
                tq.testId AS test_id,
                tq.order AS test_question_order,
                tq.answer AS test_question_answer,
                tq.active AS test_question_active,
                qt.id AS question_id,
                qg.id AS question_group_id,
                qg.name AS question_group_name,
                (
                    SELECT JSON_ARRAYAGG(JSON_OBJECT('id', qsk.id, 'reference', qsk.reference, 'description', qsk.description))
                    FROM (
                        SELECT sk2.id, sk2.reference, sk2.description
                        FROM question_skill AS qs
                        INNER JOIN skill AS sk2 ON qs.skillId = sk2.id
                        WHERE qs.questionId = qt.id
                        ORDER BY sk2.reference
                    ) AS qsk
                ) AS question_skills
            FROM test_question AS tq
                     INNER JOIN question AS qt ON tq.questionId = qt.id
                     INNER JOIN question_group AS qg ON tq.questionGroupId = qg.id
            WHERE tq.testId IN (?)
            ORDER BY tq.testId, qg.id, tq.order
        `;

      const [ queryResult ] = await conn.query(query, [testIds]);

      return TestFormatter.testQuestionsFormMultipleTests(queryResult as Array<any>)
    }
    catch (error) { console.error(error); throw error }
    finally { if (conn) { conn.release() } }
  }

  async qTestQuestions(testId: number | string) {
    let conn;
    try {
      conn = await connectionPool.getConnection();
      const query =
        `
        SELECT 
            tq.id AS test_question_id,
            tq.order AS test_question_order,
            tq.answer AS test_question_answer,
            tq.active AS test_question_active,
            qt.id AS question_id,
            qg.id AS question_group_id,
            qg.name AS question_group_name,
            (
                SELECT JSON_ARRAYAGG(JSON_OBJECT('id', qsk.id, 'reference', qsk.reference, 'description', qsk.description))
                FROM (
                    SELECT sk2.id, sk2.reference, sk2.description
                    FROM question_skill AS qs
                    INNER JOIN skill AS sk2 ON qs.skillId = sk2.id
                    WHERE qs.questionId = qt.id
                    ORDER BY sk2.reference
                ) AS qsk
            ) AS question_skills
        FROM test_question AS tq
        INNER JOIN question AS qt ON tq.questionId = qt.id
        INNER JOIN question_group AS qg ON tq.questionGroupId = qg.id
        INNER JOIN test AS tt ON tq.testId = tt.id
        WHERE tt.id = ?
        ORDER BY qg.id, tq.order
      `

      const [ queryResult ] = await conn.query(query, [testId])
      return TestFormatter.testQuestions(queryResult as qTestQuestions[])
    }
    catch (error) { console.error(error); throw error }
    finally { if (conn) { conn.release() } }
  }

  async qTestQuestionsWithTitle(testId: number | string) {
    let conn;
    try {
      conn = await connectionPool.getConnection();
      const query =
        `
            SELECT
                tq.id AS test_question_id, tq.order AS test_question_order, tq.active AS test_question_active,
                tq.optionsOrder AS test_question_options_order,
                qt.id AS question_id,
                qt.title AS question_title,
                qg.id AS question_group_id, qg.name AS question_group_name,
                (
                    SELECT JSON_ARRAYAGG(JSON_OBJECT('id', qi.id, 'type', qi.type, 'order', qi.order, 's3Key', qi.s3Key, 'position', qi.position))
                    FROM question_image AS qi
                    WHERE qi.questionId = qt.id AND qi.active = 1
                ) AS question_images,
                (
                    SELECT JSON_ARRAYAGG(JSON_OBJECT('id', qsk.id, 'reference', qsk.reference, 'description', qsk.description))
                    FROM (
                        SELECT sk2.id, sk2.reference, sk2.description
                        FROM question_skill AS qs
                        INNER JOIN skill AS sk2 ON qs.skillId = sk2.id
                        WHERE qs.questionId = qt.id
                        ORDER BY sk2.reference
                    ) AS qsk
                ) AS question_skills,
                (
                    SELECT JSON_ARRAYAGG(JSON_OBJECT('id', qop.id, 'label', qop.label, 'text', qop.text, 'order', qop.order))
                    FROM (
                        SELECT qo.id, qo.label, qo.text, qo.order
                        FROM question_option AS qo
                        WHERE qo.questionId = qt.id AND qo.active = 1
                        ORDER BY qo.order
                    ) AS qop
                ) AS question_options
            FROM test_question AS tq
                     INNER JOIN question AS qt ON tq.questionId = qt.id
                     INNER JOIN question_group AS qg ON tq.questionGroupId = qg.id
                     INNER JOIN test AS tt ON tq.testId = tt.id
            WHERE tt.id = ?
            ORDER BY qg.id, tq.order
        `

      const [ queryResult ] = await conn.query(query, [testId])
      return TestFormatter.testQuestionsWithTitle(queryResult as qTestQuestionsWithImages[])
    }
    catch (error) { console.error(error); throw error }
    finally { if (conn) { conn.release() } }
  }

  // Equivalente ao antigo TestController#getTestQuestions (TypeORM), usado só no fluxo de
  // edição de prova (getById/updateTest) — não confundir com qTestQuestionsWithTitle acima,
  // que serve o fluxo do aluno e propositalmente esconde `answer`.
  // Índices esperados: test_question(testId) [existe], test_question(questionId) [existe],
  // question(disciplineId/classroomCategoryId/skillId) [existem], question_image(questionId) [existe]
  async qTestQuestionsFull(testId: number) {
    let conn;
    try {
      conn = await connectionPool.getConnection();
      const query =
        `
        SELECT
            tq.id AS test_question_id,
            tq.order AS test_question_order,
            tq.answer AS test_question_answer,
            tq.active AS test_question_active,
            tq.optionsOrder AS test_question_options_order,
            qt.id AS question_id,
            qt.title AS question_title,
            qt.correctLabel AS question_correct_label,
            qt.personId AS question_person_id,
            qt.disciplineId AS question_discipline_id,
            d.name AS question_discipline_name,
            qt.classroomCategoryId AS question_classroom_category_id,
            cc.name AS question_classroom_category_name,
            (
                SELECT JSON_ARRAYAGG(JSON_OBJECT('id', qi.id, 'type', qi.type, 'order', qi.order, 's3Key', qi.s3Key, 'position', qi.position))
                FROM question_image AS qi
                WHERE qi.questionId = qt.id AND qi.active = 1
            ) AS question_images,
            (
                SELECT COUNT(*) FROM test_question AS tq2 WHERE tq2.questionId = qt.id AND tq2.testId != ?
            ) AS question_in_use,
            (
                SELECT JSON_ARRAYAGG(JSON_OBJECT('id', qsk.id, 'reference', qsk.reference, 'description', qsk.description))
                FROM (
                    SELECT sk2.id, sk2.reference, sk2.description
                    FROM question_skill AS qs
                    INNER JOIN skill AS sk2 ON qs.skillId = sk2.id
                    WHERE qs.questionId = qt.id
                    ORDER BY sk2.reference
                ) AS qsk
            ) AS question_skills,
            (
                SELECT JSON_ARRAYAGG(JSON_OBJECT('id', qop.id, 'label', qop.label, 'text', qop.text, 'order', qop.order))
                FROM (
                    SELECT qo.id, qo.label, qo.text, qo.order
                    FROM question_option AS qo
                    WHERE qo.questionId = qt.id AND qo.active = 1
                    ORDER BY qo.order
                ) AS qop
            ) AS question_options,
            qg.id AS question_group_id,
            qg.name AS question_group_name
        FROM test_question AS tq
            INNER JOIN question AS qt ON tq.questionId = qt.id
            LEFT JOIN discipline AS d ON qt.disciplineId = d.id
            LEFT JOIN classroom_category AS cc ON qt.classroomCategoryId = cc.id
            INNER JOIN question_group AS qg ON tq.questionGroupId = qg.id
        WHERE tq.testId = ?
        ORDER BY qg.id, tq.order
      `
      const [ queryResult ] = await conn.query(query, [testId, testId])
      return TestFormatter.testQuestionsFull(queryResult as qTestQuestionsFull[])
    }
    catch (error) { console.error(error); throw error }
    finally { if (conn) { conn.release() } }
  }

  async qAllQuestions(disciplineId: number, withOptions = false) {
    let conn;
    try {
      conn = await connectionPool.getConnection();
      const optionsSelect = `,
          q.correctLabel AS question_correct_label,
          (
            SELECT JSON_ARRAYAGG(JSON_OBJECT('id', qop.id, 'label', qop.label, 'text', qop.text, 'order', qop.order))
            FROM (
              SELECT qo.id, qo.label, qo.text, qo.order
              FROM question_option AS qo
              WHERE qo.questionId = q.id AND qo.active = 1
              ORDER BY qo.order
            ) AS qop
          ) AS question_options`
      const optionsWhere = `
          AND EXISTS (SELECT 1 FROM question_option qo WHERE qo.questionId = q.id AND qo.active = 1)`
      const query = `
        SELECT
          q.id AS q_id, q.title AS q_title, q.classroomNumber AS q_classroomNumber, q.active AS q_active,
          q.createdAt AS q_createdAt, q.updatedAt AS q_updatedAt, q.createdByUser AS q_createdByUser, q.updatedByUser AS q_updatedByUser,
          p.id AS person_id, p.name AS person_name, p.birth AS person_birth,
          sk.id AS skill_id, sk.reference AS skill_reference, sk.description AS skill_description,
          sk.createdAt AS skill_createdAt, sk.updatedAt AS skill_updatedAt, sk.createdByUser AS skill_createdByUser, sk.updatedByUser AS skill_updatedByUser,
          d.id AS discipline_id, d.name AS discipline_name,
          cc.id AS cc_id, cc.name AS cc_name, cc.createdAt AS cc_createdAt, cc.updatedAt AS cc_updatedAt, cc.createdByUser AS cc_createdByUser, cc.updatedByUser AS cc_updatedByUser,
          (SELECT COUNT(*) FROM test_question tq WHERE tq.questionId = q.id) AS inUse,
          (
            SELECT JSON_ARRAYAGG(JSON_OBJECT(
              'id', qi.id, 'type', qi.type, 'order', qi.order, 's3Key', qi.s3Key, 'active', qi.active,
              'createdAt', qi.createdAt, 'updatedAt', qi.updatedAt, 'createdByUser', qi.createdByUser, 'updatedByUser', qi.updatedByUser
            ))
            FROM question_image qi WHERE qi.questionId = q.id AND qi.active = 1
          ) AS questionImages,
          (
            SELECT JSON_ARRAYAGG(JSON_OBJECT('id', qsk.id, 'reference', qsk.reference, 'description', qsk.description))
            FROM (
              SELECT sk2.id, sk2.reference, sk2.description
              FROM question_skill AS qs
              INNER JOIN skill AS sk2 ON qs.skillId = sk2.id
              WHERE qs.questionId = q.id
              ORDER BY sk2.reference
            ) AS qsk
          ) AS question_skills${withOptions ? optionsSelect : ''}
        FROM question q
          LEFT JOIN person p ON p.id = q.personId
          LEFT JOIN skill sk ON sk.id = (
            SELECT qs1.skillId FROM question_skill qs1
            INNER JOIN skill sk1 ON sk1.id = qs1.skillId
            WHERE qs1.questionId = q.id
            ORDER BY sk1.reference, sk1.id
            LIMIT 1
          )
          LEFT JOIN discipline d ON d.id = q.disciplineId
          LEFT JOIN classroom_category cc ON cc.id = q.classroomCategoryId
        WHERE q.disciplineId = ?${withOptions ? optionsWhere : ''}
        ORDER BY q.id ASC
      `

      const [ queryResult ] = await conn.query(query, [disciplineId])
      return TestFormatter.allQuestions(queryResult as any[], withOptions)
    }
    catch (error) { console.error(error); throw error }
    finally { if (conn) { conn.release() } }
  }

  async qTestQuestionsGroupsOnReport(testId: number) {
    let conn;
    try{
      conn = await connectionPool.getConnection();
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
    catch (error) { console.error(error); throw error }
    finally { if (conn) { conn.release() } }
  }

  async bactchQueryAlphaQuestions(testIds: number[]){
    let conn;
    try {
      conn = await connectionPool.getConnection();
      const batchQuery = `
        SELECT 
          tq.id AS test_question_id, 
          tq.order AS test_question_order, 
          tq.answer AS test_question_answer, 
          tq.active AS test_question_active,
          tq.testId AS test_id,
          qt.id AS question_id,
          qg.id AS question_group_id, 
          qg.name AS question_group_name
        FROM test_question AS tq
        INNER JOIN question AS qt ON tq.questionId = qt.id
        INNER JOIN question_group AS qg ON tq.questionGroupId = qg.id
        INNER JOIN test AS tt ON tq.testId = tt.id
        WHERE tt.id IN (${testIds.map(() => '?').join(',')})
        ORDER BY tt.id, qg.id, tq.order
      `;

      const [batchResult] = await conn.query(batchQuery, testIds);
      return batchResult

    }
    catch (error) { console.error(error); throw error }
    finally { if (conn) { conn.release() } }
  }
}

export const testQuestionRepository = new TestQuestionRepository()

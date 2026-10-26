import { Test } from "../model/Test";
import { TestQuestion } from "../model/TestQuestion";
import { TEST_CATEGORIES_IDS } from "../utils/enums";
import { connectionPool } from "../services/db";
import { withTransaction } from "../services/dbTransaction";

class StudentTestStatusRepository {

  async unifiedTestQuestLinkSql(createStatus: boolean, stuClassrooms: any[], test: Test, testQuestions: TestQuestion[], userId: number): Promise<string[] | void> {
    try {
      return await withTransaction(async (conn) => {

        if (!stuClassrooms || stuClassrooms.length === 0) { return }

        const studentIds = stuClassrooms.map(sC => sC.student?.id ?? sC.student_id).filter(id => id);
        const studentClassroomIds = stuClassrooms.map(sC => sC.student_classroom_id ?? sC.id).filter(id => id);
        const testQuestionIds = testQuestions.map(tq => tq.id);

        if (studentIds.length === 0 || testQuestionIds.length === 0) { return }

        let existingStatusScIds = new Set<number>();
        let studentsWhoCompletedTest = new Set<number>();

        const [testRows]: [any[], any] = await conn.query(`SELECT id, active, endedAt FROM test WHERE id = ?`, [test.id]);
        const currentTest = testRows[0];
        const isTestActive = currentTest.active === 1 && (currentTest.endedAt && new Date() <= new Date(currentTest.endedAt));

        if (test.category.id === TEST_CATEGORIES_IDS.SIM_ITA) {
          const [completedTestRows]: [any[], any] = await conn.query(
            `
          SELECT DISTINCT sc.studentId
          FROM student_test_status sts
          INNER JOIN student_classroom sc ON sts.studentClassroomId = sc.id
          WHERE sts.testId = ? 
            AND sc.studentId IN (?)
            AND sts.active = 0
          `,
            [test.id, studentIds]
          );
          studentsWhoCompletedTest = new Set(completedTestRows.map((row: any) => row.studentId));
        }

        const [existingStatusesRows]: [any[], any] = await conn.query(
          `SELECT studentClassroomId FROM student_test_status WHERE testId = ? AND studentClassroomId IN (?) FOR UPDATE`,
          [test.id, studentClassroomIds]
        );
        existingStatusScIds = new Set(existingStatusesRows.map((row: any) => row.studentClassroomId));

        const eQuery = `SELECT studentId, testQuestionId FROM student_question WHERE studentId IN (?) AND testQuestionId IN (?) FOR UPDATE`
        const [questionsRows]: [any[], any] = await conn.query(eQuery, [studentIds, testQuestionIds]);
        const questionKeys = new Set(questionsRows.map((row: any) => `${row.studentId}-${row.testQuestionId}`));

        const statusesToSave: any[] = [];
        const questionsToSave: any[] = [];

        for (const sC of stuClassrooms) {
          const studentId = sC.student?.id ?? sC.student_id;
          const studentClassroomId = sC.student_classroom_id ?? sC.id;

          if (test.category.id === TEST_CATEGORIES_IDS.SIM_ITA && studentsWhoCompletedTest.has(studentId)) { continue }

          if ((test.category.id === TEST_CATEGORIES_IDS.SIM_ITA) && (sC.endedAt != null || existingStatusScIds.has(studentClassroomId))) { continue }

          // ✅ NOVA VERIFICAÇÃO: Só cria registros se teste ativo OU aluno já tem vínculo
          const shouldCreateRecords = isTestActive || existingStatusScIds.has(studentClassroomId);

          // ✅ Só cria student_test_status se teste ativo OU aluno já tinha
          if (createStatus && !existingStatusScIds.has(studentClassroomId) && shouldCreateRecords) {
            statusesToSave.push([true, test.id, studentClassroomId, '', userId]);
            existingStatusScIds.add(studentClassroomId);
          }

          // ✅ Só cria student_question se teste ativo OU aluno já tinha vínculo
          if (shouldCreateRecords) {
            for (const tQ of testQuestions) {
              const uniqueKey = `${studentId}-${tQ.id}`;
              if (!questionKeys.has(uniqueKey)) { questionsToSave.push(['', tQ.id, studentId, userId]); questionKeys.add(uniqueKey) }
            }
          }
        }

        if (statusesToSave.length > 0) {
          const statusPlaceholders = statusesToSave.map(() => '(?, ?, ?, ?, NOW(), ?)').join(', ');
          const statusQuery =
            `
              INSERT INTO student_test_status
              (active, testId, studentClassroomId, observation, createdAt, createdByUser)
              VALUES ${statusPlaceholders}
              ON DUPLICATE KEY UPDATE
                updatedAt = NOW(),
                updatedByUser = VALUES(createdByUser)
            `;
          const statusFlatValues = statusesToSave.flat();
          await conn.query(statusQuery, statusFlatValues);
        }

        if (questionsToSave.length > 0) {
          const questionPlaceholders = questionsToSave.map(() => '(?, ?, ?, NOW(), ?)').join(', ');
          const questionQuery = `
          INSERT INTO student_question 
          (answer, testQuestionId, studentId, createdAt, createdByUser)
          VALUES ${questionPlaceholders}
          ON DUPLICATE KEY UPDATE
            updatedAt = NOW(),
            updatedByUser = VALUES(createdByUser)
        `;
          const questionFlatValues = questionsToSave.flat();
          await conn.query(questionQuery, questionFlatValues);
        }

      })
    }
    catch (error) { console.error(error); throw error }
  }

  async findAndDeleteStatusAndQuestions(testId: number, classroomId: number) {
    return withTransaction(async (conn) => {
      const query =
        `
          SELECT sts.id AS studentTestStatusId, sts.studentClassroomId AS studentClassroomId, sts.testId AS testId, sc_current.rosterNumber AS rosterNumber, sc_current.studentId AS studentId
          FROM student_test_status sts
            INNER JOIN student_classroom sc_current ON sts.studentClassroomId = sc_current.id AND sc_current.classroomId = ? AND sc_current.endedAt IS NOT NULL
            INNER JOIN student_classroom sc_active ON sc_current.studentId = sc_active.studentId AND sc_active.endedAt IS NULL
            INNER JOIN test tt ON sts.testId = tt.id AND tt.id = ?
          WHERE sts.studentClassroomId != sc_active.id AND sc_active.classroomId IN (1216, 1217, 1218, 1509)
            AND NOT EXISTS 
              (
                SELECT 1 
                FROM student_question sq INNER JOIN test_question tq ON sq.testQuestionId = tq.id 
                WHERE sq.studentId = sc_current.studentId AND tq.testId = ? AND (sq.answer IS NOT NULL AND sq.answer != '')
              )
          ORDER BY sc_current.rosterNumber ASC
          FOR UPDATE;
        `
      const [results] = await conn.query(query, [classroomId, testId, testId]) as [{ studentTestStatusId: number, studentClassroomId: number, testId: number, rosterNumber: number, studentId: number }[], any];

      if (results.length === 0) { return }

      const query2 = `DELETE FROM student_test_status WHERE id IN (?);`
      const query3 = `DELETE sq FROM student_question AS sq INNER JOIN test_question AS tq ON sq.testQuestionId = tq.id WHERE sq.studentId IN (?) AND tq.testId = ?;`

      await conn.query(query2, [results.map(row => row.studentTestStatusId)]);
      await conn.query(query3, [results.map(row => row.studentId), testId]);

    })
  }

  /**
   * Migra vínculo (student_test_status) preso a matrícula antiga para a matrícula ativa.
   * Escopo: sala (fluxo do professor abrindo a tela de lançamento).
   *
   * ⚠️ PAR: existe um método equivalente escopado por aluno — updateAllStudentTestStatus_two —
   * usado no fluxo de login do aluno (SIMULADO). Alterações na regra de migração
   * (ex: a checagem de has_any_answers) devem ser refletidas nos DOIS métodos.
   */
  async updateStudentTestStatus(testId: number, classroomId: number, yearName: string, userId: number): Promise<void> {
    return withTransaction(async (conn) => {

      const query = `
      SELECT
        sts.id AS sts_id,
        sts.studentClassroomId AS current_sc_id,
        sc_current.studentId,
        sc_current.classroomId AS current_classroom_id,
        sc_active.id AS active_sc_id,
        sc_active.classroomId AS active_classroom_id,
        (SELECT COUNT(*) 
         FROM student_question sq
         INNER JOIN test_question tq ON sq.testQuestionId = tq.id
         INNER JOIN test tt ON tq.testId = tt.id 
         WHERE sq.studentId = sc_current.studentId
           AND tq.testId = ?
           AND (tt.active = 1 AND NOW() <= tt.endedAt)
           AND sq.answer IS NOT NULL
           AND sq.answer != ''
        ) AS has_any_answers
      FROM student_test_status sts
      INNER JOIN test tt ON sts.testId = tt.id
      INNER JOIN student_classroom sc_current ON sts.studentClassroomId = sc_current.id
      INNER JOIN year y_current ON sc_current.yearId = y_current.id
      INNER JOIN student_classroom sc_active ON sc_current.studentId = sc_active.studentId AND sc_active.endedAt IS NULL
      INNER JOIN year y_active ON sc_active.yearId = y_active.id
      WHERE sts.testId = ?
        AND (tt.active = 1 AND NOW() <= tt.endedAt)
        AND y_current.name = ?
        AND y_active.name = ?
        AND (sc_active.classroomId = ? OR sc_current.classroomId = ?)
        AND sts.studentClassroomId != sc_active.id
      FOR UPDATE  -- 🔒 LOCK PESSIMISTA
    `;

      const [results] = await conn.query(query, [testId, testId, yearName, yearName, classroomId, classroomId]) as [any[], any];

      for (const row of results) {
        const hasAnyAnswers = row.has_any_answers > 0;

        // Sua regra de ouro: só mexe se NÃO houver respostas (ou se foram zeradas)
        if (!hasAnyAnswers) {

          // Verifica se a matrícula ativa já ganhou um vínculo com essa prova por outro fluxo
          const [existingStatus] = await conn.query(
            `SELECT id FROM student_test_status WHERE studentClassroomId = ? AND testId = ?`,
            [row.active_sc_id, testId]
          ) as [any[], any];

          if (existingStatus.length > 0) {
            // Se o aluno já tem o vínculo na sala nova, tentar um UPDATE vai gerar o ER_DUP_ENTRY.
            // Como o vínculo velho não tem respostas, nós apenas deletamos ele para limpar o banco.
            const queryDelete = `DELETE FROM student_test_status WHERE id = ?`;
            await conn.query(queryDelete, [row.sts_id]);
          } else {
            // Se a sala nova ainda não tem o vínculo, seguimos com a sua automação padrão de transferência.
            const queryUpdate = `UPDATE student_test_status SET studentClassroomId = ?, updatedAt = NOW(), updatedByUser = ? WHERE id = ?`;
            await conn.query(queryUpdate, [row.active_sc_id, userId, row.sts_id]);
          }
        }
      }

    })
  }

  // Índices esperados: student_test_status(id, studentClassroomId, testId) [unique composto]
  async qUpdateTestStatus(statusId: number, studentClassroomId: number, testId: number, observation: string | undefined, active: boolean | undefined, userId: number) {
    let conn;
    try {
      conn = await connectionPool.getConnection();
      await conn.beginTransaction();

      const [ rows ] = await conn.query(
        `SELECT id, observation, active FROM student_test_status WHERE id = ? AND studentClassroomId = ? AND testId = ? LIMIT 1 FOR UPDATE`,
        [statusId, studentClassroomId, testId]
      );
      const register = (rows as any[])[0];

      if (!register) { await conn.commit(); return null }

      const newObservation = observation ?? register.observation;
      const newActive = active ?? register.active;

      await conn.query(
        `UPDATE student_test_status SET observation = ?, active = ?, updatedByUser = ?, updatedAt = NOW() WHERE id = ?`,
        [newObservation, newActive, userId, register.id]
      );
      await conn.commit();

      return register;
    }
    catch (error) { if (conn) await conn.rollback(); console.error(error); throw error }
    finally { if (conn) { conn.release() } }
  }

  /**
   * Migra vínculos (student_test_status) presos a matrículas antigas para a matrícula ativa.
   * Escopo: aluno (fluxo de login/listagem/abertura de prova do tipo SIMULADO).
   *
   * ⚠️ PAR: espelha a regra de updateStudentTestStatus (escopado por sala, fluxo do professor).
   * Alterações na regra de migração devem ser refletidas nos DOIS métodos.
   */
  async updateAllStudentTestStatus(studentId: number, yearName: string, userId: number): Promise<void> {

    const MAX_ATTEMPTS = 3;

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {

      let conn;
      let inTransaction = false;

      try {
        conn = await connectionPool.getConnection();

        // Verificação leve, sem transação e sem lock.
        // Na maioria dos logins o aluno não tem vínculo órfão, e este atalho evita
        // abrir transação e travar linhas à toa quando não há nada a migrar.
        const preCheckQuery = `
        SELECT 1
        FROM student_test_status sts
        INNER JOIN test tt ON sts.testId = tt.id
        INNER JOIN student_classroom sc_current ON sts.studentClassroomId = sc_current.id
        INNER JOIN student_classroom sc_active ON sc_current.studentId = sc_active.studentId AND sc_active.endedAt IS NULL
        WHERE tt.categoryId = 6
          AND (tt.active = 1 AND NOW() <= tt.endedAt)
          AND sc_current.studentId = ?
          AND sts.studentClassroomId != sc_active.id
        LIMIT 1
      `;

        const [preCheck] = await conn.query(preCheckQuery, [studentId]) as [any[], any];
        if (!preCheck || preCheck.length === 0) { return }

        // A partir daqui existe pelo menos um vínculo órfão: abre transação e trava as linhas.
        await conn.beginTransaction();
        inTransaction = true;

        const query = `
        SELECT
          sts.id AS sts_id,
          sts.testId AS test_id,
          sts.studentClassroomId AS current_sc_id,
          sc_current.studentId,
          sc_active.id AS active_sc_id,
          (SELECT COUNT(*) 
           FROM student_question sq
           INNER JOIN test_question tq ON sq.testQuestionId = tq.id
           WHERE sq.studentId = sc_current.studentId
             AND tq.testId = sts.testId
             AND sq.answer IS NOT NULL
             AND sq.answer != ''
          ) AS has_any_answers
        FROM student_test_status sts
        INNER JOIN test tt ON sts.testId = tt.id
        INNER JOIN student_classroom sc_current ON sts.studentClassroomId = sc_current.id
        INNER JOIN year y_current ON sc_current.yearId = y_current.id
        INNER JOIN student_classroom sc_active ON sc_current.studentId = sc_active.studentId AND sc_active.endedAt IS NULL
        INNER JOIN year y_active ON sc_active.yearId = y_active.id
        WHERE tt.categoryId = 6
          AND (tt.active = 1 AND NOW() <= tt.endedAt)
          AND y_current.name = ?
          AND y_active.name = ?
          AND sc_current.studentId = ?
          AND sts.studentClassroomId != sc_active.id
        FOR UPDATE
      `;

        const [results] = await conn.query(query, [yearName, yearName, studentId]) as [any[], any];

        if (results.length === 0) { await conn.commit(); inTransaction = false; return }

        for (const row of results) {
          const hasAnyAnswers = row.has_any_answers > 0;

          // Regra de ouro: só migra o vínculo se NÃO houver nenhuma resposta gravada.
          if (!hasAnyAnswers) {

            // FOR UPDATE aqui fecha a janela de corrida com o fluxo do professor,
            // que pode inserir este mesmo vínculo (testId + matrícula ativa) simultaneamente.
            const [existingStatus] = await conn.query(
              `SELECT id FROM student_test_status WHERE studentClassroomId = ? AND testId = ? FOR UPDATE`,
              [row.active_sc_id, row.test_id]
            ) as [any[], any];

            if (existingStatus.length > 0) {
              // Matrícula ativa já possui vínculo. O antigo (sem respostas) é removido.
              const queryDelete = `DELETE FROM student_test_status WHERE id = ?`;
              await conn.query(queryDelete, [row.sts_id]);
            } else {
              // Migra o vínculo da matrícula antiga para a ativa.
              const queryUpdate = `UPDATE student_test_status SET studentClassroomId = ?, updatedAt = NOW(), updatedByUser = ? WHERE id = ?`;
              await conn.query(queryUpdate, [row.active_sc_id, userId, row.sts_id]);
            }
          }
        }

        await conn.commit();
        inTransaction = false;

        return;
      }
      catch (error: any) {

        if (conn && inTransaction) { await conn.rollback(); inTransaction = false }

        // Deadlock (1213) ou lock timeout (1205) podem ocorrer quando o fluxo do professor
        // trava as mesmas linhas simultaneamente. Uma nova tentativa costuma resolver,
        // pois a transação concorrente já terá liberado os locks.
        const retryable = error?.errno === 1213 || error?.errno === 1205;

        if (retryable && attempt < MAX_ATTEMPTS) {
          if (conn) { conn.release(); conn = undefined }
          await new Promise(resolve => setTimeout(resolve, 50 * attempt));
          continue;
        }

        throw error;
      }
      finally { if (conn) conn.release() }
    }
  }

  async qUpdateAndValidateAnswer(studentQuestionId: number, newAnswer: string, classroomId: number, studentClassroomId: number, userId: number) {
    let conn;
    try {
      conn = await connectionPool.getConnection();
      await conn.beginTransaction();

      const updateQuery = `
          UPDATE
              student_question AS sq
                  INNER JOIN test_question AS tq ON sq.testQuestionId = tq.id
                  INNER JOIN test AS tt ON tq.testId = tt.id
                  INNER JOIN student AS s ON sq.studentId = s.id
                  INNER JOIN student_classroom AS sc ON sc.id = ?
          SET
              sq.answer = ?,
              sq.rClassroomId = ?,
              sq.updatedAt = NOW(),
              sq.updatedByUser = ?
          WHERE
              sq.id = ?
            AND tt.active = 1
            AND sc.endedAt IS NULL
            AND (sq.rClassroomId IS NULL OR sq.rClassroomId = ?)
      `;

      const isAnswerEmpty = !newAnswer || newAnswer.trim().length === 0;
      const params = [studentClassroomId, newAnswer, isAnswerEmpty ? null : classroomId, userId, studentQuestionId, classroomId];

      const [updateResult] = await conn.query(updateQuery, params) as any[];

      if (updateResult.affectedRows === 0) { await conn.rollback(); return null }

      const selectQuery = `
          SELECT sq.*, tq.answer AS correctAnswer
          FROM student_question sq
                   INNER JOIN test_question tq ON sq.testQuestionId = tq.id
          WHERE sq.id = ?
      `;

      const [selectResult] = await conn.query(selectQuery, [studentQuestionId]) as any[];

      await conn.commit();

      return selectResult[0];
    }
    catch (error) { if(conn){ await conn.rollback() } console.error(error); throw error }
    finally { if (conn) { conn.release() } }
  }
}

export const studentTestStatusRepository = new StudentTestStatusRepository()

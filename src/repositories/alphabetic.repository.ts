import { qAlphabeticLevels, qAlphaTests, qYear } from "../interfaces/interfaces";
import { Test } from "../model/Test";
import { TestQuestion } from "../model/TestQuestion";
import { connectionPool } from "../services/db";
import { TestFormatter } from "../utils/formatters/test.formatter";
import { AlphabeticFormatter } from "../utils/formatters/alphabetic.formatter";

class AlphabeticRepository {

  // Semeia os vínculos (alphabetic + student_question) de TODAS as AVLs da tela numa
  // transação só.
  //
  // Era uma chamada por AVL, disparadas em Promise.all pelo chamador: N transações
  // concorrentes gravando nas mesmas linhas de aluno. Com duas abas/dois professores
  // abrindo a mesma turma antes do seeding existir, as transações pegavam os locks em
  // ordens diferentes e o MySQL matava uma com ER_LOCK_DEADLOCK (1213) — que subia como
  // 500 pro usuário, num fluxo que é só "abrir a tela"
  //
  // Duas defesas, que resolvem coisas diferentes:
  //  - uma transação e um INSERT por tabela, com os valores ORDENADOS de forma
  //    determinística: requisições concorrentes passam a pegar os locks na mesma ordem,
  //    então elas enfileiram em vez de formar ciclo;
  //  - retry em 1213/1205, para o que sobrar de concorrência real entre usuários.
  async qLinkAlphabetic(stuClassrooms: { student?: { id: number }; student_id?: number }[], tests: { test: Test, testQuestions: TestQuestion[] }[], userId: number) {

    const MAX_ATTEMPTS = 3;

    if (!userId || userId <= 0) { throw new Error('userId inválido') }

    if (!stuClassrooms || stuClassrooms.length === 0) { return }

    const validTests = (tests ?? []).filter(t => t?.test?.id);
    if (validTests.length === 0) { return }

    const studentIds = stuClassrooms
      .map(sC => sC.student?.id ?? sC.student_id)
      .filter((id): id is number => id !== undefined && id !== null);

    if (studentIds.length === 0) { return }

    const testIds = validTests.map(t => t.test.id);
    const testQuestionIds = validTests.flatMap(t => (t.testQuestions ?? []).map(tq => tq.id));

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {

      let conn;
      let inTransaction = false;

      try {
        conn = await connectionPool.getConnection();
        await conn.beginTransaction();
        inTransaction = true;

        const [existingAlphabeticRows] = await conn.query(
          `SELECT studentId, testId FROM alphabetic WHERE testId IN (?) AND studentId IN (?)`,
          [testIds, studentIds]
        ) as any[];

        const existingAlphabetic = new Set(existingAlphabeticRows.map((row: any) => `${row.studentId}-${row.testId}`));

        let questionKeys = new Set<string>();
        if (testQuestionIds.length > 0) {
          const [questionsRows] = await conn.query(
            `SELECT studentId, testQuestionId FROM student_question WHERE studentId IN (?) AND testQuestionId IN (?)`,
            [studentIds, testQuestionIds]
          ) as any[];
          questionKeys = new Set(questionsRows.map((row: any) => `${row.studentId}-${row.testQuestionId}`));
        }

        const alphabeticLinksToSave: [number, number, number][] = [];
        const questionsToSave: [string, number, number, number][] = [];

        for (const sC of stuClassrooms) {
          const studentId = sC.student?.id ?? sC.student_id;

          if (!studentId) continue;

          for (const { test, testQuestions } of validTests) {

            const alphabeticKey = `${studentId}-${test.id}`;
            if (!existingAlphabetic.has(alphabeticKey)) {
              alphabeticLinksToSave.push([userId, studentId, test.id]);
              existingAlphabetic.add(alphabeticKey);
            }

            for (const tQ of testQuestions ?? []) {
              const uniqueKey = `${studentId}-${tQ.id}`;
              if (!questionKeys.has(uniqueKey)) {
                questionsToSave.push(['', tQ.id, studentId, userId]);
                questionKeys.add(uniqueKey);
              }
            }
          }
        }

        // A ordenação é o que impede o ciclo de locks entre requisições concorrentes:
        // todas percorrem as mesmas linhas na mesma sequência. Não é cosmético.
        alphabeticLinksToSave.sort((a, b) => (a[1] - b[1]) || (a[2] - b[2]));
        questionsToSave.sort((a, b) => (a[2] - b[2]) || (a[1] - b[1]));

        if (alphabeticLinksToSave.length > 0) {
          const alphabeticPlaceholders = alphabeticLinksToSave.map(() => '(NOW(), ?, ?, ?)').join(', ');
          await conn.query(
            `INSERT IGNORE INTO alphabetic (createdAt, createdByUser, studentId, testId) VALUES ${alphabeticPlaceholders}`,
            alphabeticLinksToSave.flat()
          );
        }

        if (questionsToSave.length > 0) {
          const questionPlaceholders = questionsToSave.map(() => '(?, ?, ?, NOW(), ?)').join(', ');
          const queryToInsert = `INSERT INTO student_question (answer, testQuestionId, studentId, createdAt, createdByUser) VALUES ${ questionPlaceholders } ON DUPLICATE KEY UPDATE updatedAt = NOW(), updatedByUser = VALUES(createdByUser)`
          await conn.query(queryToInsert, questionsToSave.flat());
        }

        await conn.commit();
        inTransaction = false;

        return;
      }
      catch (error: any) {

        if (conn && inTransaction) { await conn.rollback(); inTransaction = false }

        // Mesma política do fluxo de transferência de matrícula: deadlock (1213) e lock
        // timeout (1205) são transitórios — a transação concorrente já soltou os locks
        // quando a nova tentativa roda. O seeding é idempotente (INSERT IGNORE e
        // ON DUPLICATE KEY UPDATE), então repetir é seguro.
        const retryable = error?.errno === 1213 || error?.errno === 1205;

        if (retryable && attempt < MAX_ATTEMPTS) {
          if (conn) { conn.release(); conn = undefined }
          await new Promise(resolve => setTimeout(resolve, 50 * attempt));
          continue;
        }

        console.error(error);
        throw error;
      }
      finally { if (conn) { conn.release() } }
    }
  }

  async qAlphabeticHeaders(yearName: string) {
    let conn;
    try {
      conn = await connectionPool.getConnection();

      const qYear = `
        SELECT year.id, year.name, period.id AS period_id, bimester.id AS bimester_id, bimester.name AS bimester_name, bimester.testName AS bimester_testName
        FROM year
            INNER JOIN period ON period.yearId = year.id
            INNER JOIN bimester ON period.bimesterId = bimester.id
        WHERE year.name = ?
      `;
      const qAlphabeticLevels = `
        SELECT al.id, al.shortName, al.color
        FROM alphabetic_level AS al
      `;

      const [[qYearResult], [qAlphaLevelsResult]] = await Promise.all([conn.query(qYear, [yearName]), conn.query(qAlphabeticLevels, [])]);

      let year = AlphabeticFormatter.alphabeticYearHeader(qYearResult as qYear[]);
      const alphabeticLevels = qAlphaLevelsResult as qAlphabeticLevels[];

      return year.periods.flatMap(period => ({ ...period.bimester, levels: alphabeticLevels }));
    }
    catch (error) { console.error(error); throw error }
    finally { if (conn) { conn.release() } }
  }

  // Índices esperados: test(categoryId, periodId), period(yearId, bimesterId), alphabetic(testId, studentId) [unique]
  async qUpsertAlphabetic(testCategoryId: number, yearName: string, examBimesterId: number, studentId: number, studentClassroomId: number, alphabeticLevelId: number | null, classroomId: number, userId: number) {
    let conn;
    try {
      conn = await connectionPool.getConnection();
      await conn.beginTransaction();

      const testQuery = `
        SELECT t.id, t.active, b.name AS bimester_name
        FROM test AS t
        INNER JOIN period AS p ON t.periodId = p.id
        INNER JOIN year AS y ON p.yearId = y.id
        INNER JOIN bimester AS b ON p.bimesterId = b.id
        WHERE t.categoryId = ? AND y.name = ? AND b.id = ?
        LIMIT 1
      `;
      const [ testRows ] = await conn.query(testQuery, [testCategoryId, yearName, examBimesterId]);
      const test = (testRows as any[])[0];

      if (!test) { await conn.commit(); return { outcome: 'test_not_found' as const } }
      if (!test.active) { await conn.commit(); return { outcome: 'test_inactive' as const, bimesterName: test.bimester_name } }

      const [ alphaRows ] = await conn.query(
        `SELECT id, alphabeticLevelId, rClassroomId, observation FROM alphabetic WHERE testId = ? AND studentId = ? LIMIT 1 FOR UPDATE`,
        [test.id, studentId]
      );
      const alpha = (alphaRows as any[])[0];

      if (!alpha) {
        const [ result ]: any = await conn.query(
          `INSERT INTO alphabetic (testId, studentId, rClassroomId, alphabeticLevelId, createdByUser, createdAt) VALUES (?, ?, ?, ?, ?, NOW())`,
          [test.id, studentId, classroomId, alphabeticLevelId, userId]
        );
        await conn.commit();
        return { outcome: 'created' as const, id: result.insertId, testId: test.id };
      }

      const scQuery = `
        SELECT sc.endedAt, p.name AS studentName, c.shortName AS classroomName, s.shortName AS schoolName
        FROM student_classroom AS sc
        INNER JOIN student AS st ON sc.studentId = st.id
        INNER JOIN person AS p ON st.personId = p.id
        INNER JOIN classroom AS c ON sc.classroomId = c.id
        INNER JOIN school AS s ON c.schoolId = s.id
        WHERE sc.id = ?
      `;
      const [ scRows ] = await conn.query(scQuery, [studentClassroomId]);
      const sC = (scRows as any[])[0];

      if (sC?.endedAt && !alpha.alphabeticLevelId) {
        await conn.commit();
        return { outcome: 'classroom_ended' as const, studentName: sC.studentName, classroomName: sC.classroomName, schoolName: sC.schoolName };
      }

      if (alpha.alphabeticLevelId && alpha.rClassroomId && alpha.rClassroomId !== classroomId) {
        await conn.commit();
        return { outcome: 'registered_elsewhere' as const };
      }

      await conn.query(
        `UPDATE alphabetic SET alphabeticLevelId = ?, rClassroomId = ?, updatedByUser = ?, updatedAt = NOW() WHERE id = ?`,
        [alphabeticLevelId, classroomId, userId, alpha.id]
      );
      await conn.commit();

      return { outcome: 'updated' as const, id: alpha.id, observation: alpha.observation };
    }
    catch (error) { if (conn) await conn.rollback(); console.error(error); throw error }
    finally { if (conn) { conn.release() } }
  }

  // Índices esperados: alphabetic(testId, studentId) [unique]
  async qUpdateAlphaStatus(id: number, observation: string, studentId: number, testId: number, userId: number) {
    let conn;
    try {
      conn = await connectionPool.getConnection();
      await conn.beginTransaction();
      await conn.query(
        `UPDATE alphabetic SET observation = ?, studentId = ?, testId = ?, updatedByUser = ?, updatedAt = NOW() WHERE id = ?`,
        [observation, studentId, testId, userId, id]
      );
      await conn.commit();
    }
    catch (error) { if (conn) await conn.rollback(); console.error(error); throw error }
    finally { if (conn) { conn.release() } }
  }

  async qInsertAlphaStatus(observation: string, studentId: number, testId: number, rClassroomId: number | null, userId: number) {
    let conn;
    try {
      conn = await connectionPool.getConnection();
      await conn.beginTransaction();
      const [ result ]: any = await conn.query(
        `INSERT INTO alphabetic (observation, studentId, testId, rClassroomId, createdByUser, createdAt) VALUES (?, ?, ?, ?, ?, NOW())`,
        [observation, studentId, testId, rClassroomId, userId]
      );
      await conn.commit();
      return result.insertId as number;
    }
    catch (error) { if (conn) await conn.rollback(); console.error(error); throw error }
    finally { if (conn) { conn.release() } }
  }

  async qAlphabeticTests(categoryId: number, disciplineId: number, yearName: string) {
    let conn;
    try {
      conn = await connectionPool.getConnection();
      const query = `
      SELECT 
          t.id AS test_id, t.active AS test_active,
          d.id AS discipline_id, d.name AS discipline_name,
          tc.id AS test_category_id,
          pr.id AS period_id,
          b.id AS bimester_id, b.name AS bimester_name, b.testName AS bimester_testName,
          y.id AS year_id, y.name AS year_name           
      FROM test AS t
          INNER JOIN discipline AS d ON t.disciplineId = d.id
          INNER JOIN period AS pr ON t.periodId = pr.id
          INNER JOIN bimester AS b ON pr.bimesterId = b.id
          INNER JOIN year AS y ON pr.yearId = y.id
          INNER JOIN test_category AS tc ON t.categoryId = tc.id
      WHERE tc.id = ? AND d.id = ? AND y.name = ?
    `;

      const [ queryResult ] = await conn.query(query, [categoryId, disciplineId, yearName]);
      return TestFormatter.alphabeticTests(queryResult as qAlphaTests[]);
    }
    catch (error) { console.error(error); throw error }
    finally { if (conn) { conn.release() } }
  }
}

export const alphabeticRepository = new AlphabeticRepository()

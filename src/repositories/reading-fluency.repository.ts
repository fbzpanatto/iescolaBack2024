import { qReadingFluenciesHeaders } from "../interfaces/interfaces";
import { connectionPool } from "../services/db";
import { withTransaction } from "../services/dbTransaction";

class ReadingFluencyRepository {

  async findAndDeleteStatusAndReadingFluency(testId: number, classroomId: number) {
    try {
      return await withTransaction(async (conn) => {

        const query = `
      SELECT 
        sts.id AS studentTestStatusId,
        sts.studentClassroomId AS studentClassroomId,
        sts.testId AS testId,
        sc_current.rosterNumber AS rosterNumber,
        sc_current.studentId AS studentId
      FROM student_test_status sts
      INNER JOIN student_classroom sc_current 
        ON sts.studentClassroomId = sc_current.id 
        AND sc_current.classroomId = ? 
        AND sc_current.endedAt IS NOT NULL
      INNER JOIN student_classroom sc_active 
        ON sc_current.studentId = sc_active.studentId 
        AND sc_active.endedAt IS NULL
      INNER JOIN test tt 
        ON sts.testId = tt.id 
        AND tt.id = ?
      WHERE sts.studentClassroomId != sc_active.id 
        AND sc_active.classroomId IN (1216, 1217, 1218, 1509)
        AND (
          -- Não tem nenhum reading_fluency OU
          NOT EXISTS (
            SELECT 1 
            FROM reading_fluency rf
            WHERE rf.studentId = sc_current.studentId 
              AND rf.testId = ?
          )
          OR
          -- Tem reading_fluency mas TODOS os registros estão limpos (nulos)
          NOT EXISTS (
            SELECT 1 
            FROM reading_fluency rf
            WHERE rf.studentId = sc_current.studentId 
              AND rf.testId = ?
              AND (
                rf.rClassroomId IS NOT NULL 
                OR rf.readingFluencyExamId IS NOT NULL 
                OR rf.readingFluencyLevelId IS NOT NULL
              )
          )
        )
      ORDER BY sc_current.rosterNumber ASC
      FOR UPDATE
    `;

        const [results] = await conn.query(query, [classroomId, testId, testId, testId]) as [{ studentTestStatusId: number, studentClassroomId: number, testId: number, rosterNumber: number, studentId: number }[], any];

        if (results.length === 0) { return }

        const query2 = `DELETE FROM student_test_status WHERE id IN (?);`;
        const query3 = `DELETE FROM reading_fluency WHERE studentId IN (?) AND testId = ?;`;

        await conn.query(query2, [results.map(row => row.studentTestStatusId)]);
        await conn.query(query3, [results.map(row => row.studentId), testId]);

      })
    }
    catch (error) { console.error('Erro ao limpar status e fluência:', error); throw error }
  }

  // Equivalente à parte de student_classroom/reading_fluency do antigo
  // TestController#getReadingFluencyForGraphic (TypeORM, 13 joins). Traz só o que os
  // consumidores finais (Helper.duplicatedStudents, TestController#cityHallResponse e
  // #readingFluencyTotalizator) realmente leem — studentStatus e student.person eram
  // carregados pelo TypeORM mas nunca chegavam a ser usados; student_test_status vira
  // EXISTS (era um LEFT JOIN + WHERE que na prática funcionava como INNER, exigindo que
  // o aluno tenha status de prova registrado) e reading_fluency vira INNER JOIN (mesma
  // razão: o WHERE original excluía linhas sem fluência para esta prova).
  // Índices esperados: student_classroom(classroomId)/(yearId) [existem],
  // reading_fluency(testId, studentId, readingFluencyExamId) [existe],
  // student_test_status(studentClassroomId, testId) [existe]
  async qReadingFluencyStudentClassrooms(testId: number, classroomIds: number[], yearId: number) {
    let conn;
    try {
      conn = await connectionPool.getConnection();
      const query =
        `
        SELECT
            sc.id AS sc_id, sc.endedAt AS sc_endedAt, sc.classroomId AS sc_classroom_id, sc.studentId AS student_id,
            rf.rClassroomId AS rf_r_classroom_id, rf.readingFluencyExamId AS rf_exam_id, rf.readingFluencyLevelId AS rf_level_id
        FROM student_classroom AS sc
            INNER JOIN reading_fluency AS rf ON rf.studentId = sc.studentId AND rf.testId = ?
        WHERE sc.classroomId IN (?)
          AND sc.yearId = ?
          AND EXISTS (
              SELECT 1 FROM student_test_status AS sts WHERE sts.studentClassroomId = sc.id AND sts.testId = ?
          )
      `
      const [ queryResult ] = await conn.query(query, [testId, classroomIds, yearId, testId])
      return queryResult as any[]
    }
    catch (error) { console.error(error); throw error }
    finally { if (conn) { conn.release() } }
  }

  async qReadingFluency(testId: number, studentId: number) {
    let conn;
    try {

      conn = await connectionPool.getConnection();

      const query =

        `
        SELECT rf.id, rf.readingFluencyExamId, rf.readingFluencyLevelId, rf.rClassroomId
        FROM reading_fluency AS rf 
        WHERE rf.testId = ? AND rf.studentId = ?
      `

      const [ queryResult ] = await conn.query(query, [testId, studentId])
      return queryResult as any[]

    }
    catch (error) { console.error(error); throw error }
    finally { if (conn) { conn.release() } }
  }

  async updateReadingFluencyStatus(testId: number, classroomId: number, yearName: string, userId: number): Promise<void> {
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
           FROM reading_fluency rf
           INNER JOIN test tt ON rf.testId = tt.id
           WHERE rf.studentId = sc_current.studentId
             AND rf.testId = ?
             AND (tt.active = 1 AND NOW() <= tt.endedAt)
             AND rf.rClassroomId IS NOT NULL
             AND (rf.readingFluencyExamId IS NOT NULL OR rf.readingFluencyLevelId IS NOT NULL)
          ) AS has_any_data
      FROM student_test_status sts
      INNER JOIN test tt ON sts.testId = tt.id
      INNER JOIN student_classroom sc_current 
        ON sts.studentClassroomId = sc_current.id
      INNER JOIN year y_current 
        ON sc_current.yearId = y_current.id
      INNER JOIN student_classroom sc_active 
        ON sc_current.studentId = sc_active.studentId
        AND sc_active.endedAt IS NULL
      INNER JOIN year y_active 
        ON sc_active.yearId = y_active.id
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
        const hasAnyData = row.has_any_data > 0;
        if (!hasAnyData) {
          const query = `UPDATE student_test_status SET studentClassroomId = ?, updatedAt = NOW(), updatedByUser = ? WHERE id = ?`
          await conn.query(query, [row.active_sc_id, userId, row.sts_id])
        }
      }

    })
  }

  async qReadingFluencyHeaders(examIds: number[]) {

    if (!examIds || examIds.length === 0) { return [] }

    let conn;

    try {
      conn = await connectionPool.getConnection();

      const query = `
        SELECT
          rfg.id AS id,
          rfl.id AS readingFluencyLevelId, rfl.name AS readingFluencyLevelName, rfl.color AS readingFluencyLevelColor, rfl.description AS readingFluencyLevelDescription,
          rfe.id AS readingFluencyExamId, rfe.name AS readingFluencyExamName, rfe.color AS readingFluencyExamColor, rfe.description AS readingFluencyExamDescription
        FROM reading_fluency_group AS rfg
          INNER JOIN reading_fluency_level AS rfl ON rfg.readingFluencyLevelId = rfl.id
          INNER JOIN reading_fluency_exam as rfe ON rfg.readingFluencyExamId = rfe.id
        WHERE rfe.id IN (?)
      `;

      const [ queryResult ] = await conn.query(query, [examIds]);
      return queryResult as Array<qReadingFluenciesHeaders>
    }
    catch (error) { console.error(error); throw error }
    finally { if (conn) { conn.release() } }
  }
}

export const readingFluencyRepository = new ReadingFluencyRepository()

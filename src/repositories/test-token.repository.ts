import { qTestToken } from "../interfaces/interfaces";
import { connectionPool } from "../services/db";
import { Helper } from "../utils/helpers";
import { TestToken } from "../model/Token";

class TestTokenRepository {

  async qGetAllTokens(search: string, bimesterId: number | null, disciplineId: number | null, limit: number, offset: number, teacherId: number, masterUser: boolean) {

    let conn;

    try {
      conn = await connectionPool.getConnection();

      const safeSearch = search || '';
      const testSearch = `%${safeSearch.toUpperCase()}%`;
      const classroomSearch = `%${safeSearch}%`;
      const schoolSearch = `%${safeSearch}%`;

      const spTimeNow = Helper.generateDateTime().createdAt;

      let query = `
        SELECT
          tk.id,
          tk.code,
          tk.leftUses,
          DATE_FORMAT(tk.createdAt, '%d/%m/%Y %H:%i:%s') AS createdAt,
          DATE_FORMAT(tk.expiresAt, '%d/%m/%Y %H:%i:%s') AS expiresAt,
          tt.name AS test,
          br.name AS bimester,
          upper(dc.name) AS discipline,
          pr.name AS teacher,
          cr.shortName AS classroom,
          sh.shortName AS school
        FROM test_token tk
          INNER JOIN classroom cr ON tk.classroomId = cr.id
          INNER JOIN school sh ON cr.schoolId = sh.id
          INNER JOIN test tt ON tk.testId = tt.id
          INNER JOIN period pd ON tt.periodId = pd.id
          INNER JOIN bimester br ON pd.bimesterId = br.id
          INNER JOIN discipline dc ON tt.disciplineId = dc.id
          INNER JOIN teacher th ON tk.teacherId = th.id
          INNER JOIN person pr ON th.personId = pr.id
        WHERE (tt.name LIKE ? OR cr.shortName LIKE ? OR sh.shortName LIKE ?) AND tk.expiresAt > ?`;

      // 3. Adiciona a string de data gerada pelo Node aos parâmetros
      const params: any[] = [testSearch, classroomSearch, schoolSearch, spTimeNow];

      if (!masterUser) {
        query += ` 
          AND EXISTS (
            SELECT 1 
            FROM teacher_class_discipline tcd 
            WHERE tcd.teacherId = ? 
              AND tcd.classroomId = tk.classroomId 
              AND tcd.endedAt IS NULL
          )`;

        params.push(teacherId);
      }

      if (bimesterId !== null) { query += ` AND br.id = ?`; params.push(bimesterId); }

      if (disciplineId !== null) { query += ` AND dc.id = ?`; params.push(disciplineId); }

      query += ` LIMIT ? OFFSET ?;`;
      params.push(limit, offset);

      const [selectResult] = await conn.query(query, params);
      return selectResult as Array<qTestToken>;

    }
    catch (error) { console.error(error); throw error }
    finally { if (conn) { conn.release(); } }
  }

  async createTestToken(el: { teacherId: number, leftUses: number, classroomId: number, testId: number, createdAt: string, expiresAt: string, code: string }) {
    let conn;
    try {
      conn = await connectionPool.getConnection();
      await conn.beginTransaction();

      const insertQuery = `
      INSERT INTO test_token (code, teacherId, leftUses, classroomId, testId, createdAt, expiresAt) 
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        code = VALUES(code),
        leftUses = VALUES(leftUses),
        createdAt = VALUES(createdAt),
        expiresAt = VALUES(expiresAt)
    `;

      const values = [el.code, el.teacherId, el.leftUses, el.classroomId, el.testId, el.createdAt, el.expiresAt];

      await conn.query(insertQuery, values);

      await conn.commit();

      return el.code;
    }
    catch (error) { if(conn){ await conn.rollback() } console.error(error); throw error }
    finally { if (conn) { conn.release() } }
  }

  async getTokenByCode(token: string, classroomId: number, testId: number) {

    let conn;

    try {
      conn = await connectionPool.getConnection();

      const query = `SELECT * FROM test_token WHERE BINARY code = ? AND expiresAt > ? AND classroomId = ? AND testId = ? AND leftUses > 0 LIMIT 1`;

      const [result] = await conn.query(query, [token, Helper.generateDateTime().createdAt, classroomId, testId]);

      return (result as TestToken[])[0]
    }
    catch (error) { console.error(error); throw error }
    finally { if (conn) { conn.release() } }
  }
}

export const testTokenRepository = new TestTokenRepository()

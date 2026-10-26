import { connectionPool } from "../services/db";

class AuthRepository {

  async qStudentByRa(ra: string, dv: string, birthDate: string) {
    let conn;
    try {
      conn = await connectionPool.getConnection();
      const query =
        `
        SELECT student.*, perc.id AS categoryId, per.name AS name, DATE_FORMAT(per.birth, '%d/%m/%Y') AS birthDate
        FROM student
        INNER JOIN person per ON student.personId = per.id
        INNER JOIN person_category perc ON per.categoryId = perc.id
        WHERE student.ra = ? AND student.dv = ? AND DATE_FORMAT(per.birth, '%d/%m/%Y') = ?
      `

      const [ queryResult ] = await conn.query(query, [ra, dv, birthDate])

      return (queryResult as { id: number, name: string, ra: string, dv: string, categoryId: number, birthDate: string }[])[0]
    }
    catch (error) { console.error(error); throw error }
    finally { if (conn) { conn.release() } }
  }

  async qLogin(email: string) {
    let conn;
    try {
      conn = await connectionPool.getConnection();
      const userQuery = `
      SELECT 
        u.id AS userId, 
        u.email, 
        u.password, 
        p.id AS personId,
        p.name AS personName,
        c.id AS categoryId,
        t.id AS teacherId,
        s.id AS schoolId
      FROM user AS u
      INNER JOIN person AS p ON u.personId = p.id
      INNER JOIN person_category AS c ON p.categoryId = c.id
      LEFT JOIN teacher AS t ON p.id = t.personId
      LEFT JOIN school AS s ON t.schoolId = s.id
      WHERE LOWER(u.email) = ?;
    `;

      const [ userRows ] = await conn.query(userQuery, [email]);
      return (userRows as Array<any>)[0];
    }
    catch (error) { console.error(error); throw error }
    finally { if (conn) { conn.release() } }
  }

  // Índices esperados: user(email), token_reset(userId, token)
  async qResetPassword(email: string, resetToken: string, hashedPassword: string) {
    let conn;
    try {
      conn = await connectionPool.getConnection();
      await conn.beginTransaction();

      const userQuery = `
        SELECT
            u.id AS user_id,
            u.email AS user_email,
            p.id AS person_id,
            p.name AS person_name,
            c.id AS category_id
        FROM user AS u
        INNER JOIN person AS p ON u.personId = p.id
        INNER JOIN person_category AS c ON p.categoryId = c.id
        WHERE u.email = ?
        LIMIT 1
        FOR UPDATE
      `;
      const [ userRows ] = await conn.query(userQuery, [email]);
      const userRow = (userRows as any[])[0];

      if (!userRow) { await conn.commit(); return { outcome: 'user_not_found' as const } }

      const checkTokenQuery = `SELECT userId FROM token_reset WHERE userId = ? AND token = ? FOR UPDATE`;
      const [ tokenRows ] = await conn.query(checkTokenQuery, [userRow.user_id, resetToken]);

      if (!tokenRows || (tokenRows as any[]).length === 0) {
        await conn.commit();
        return { outcome: 'token_invalid' as const };
      }

      await conn.query(`UPDATE user SET password = ? WHERE id = ?`, [hashedPassword, userRow.user_id]);
      await conn.query(`DELETE FROM token_reset WHERE userId = ?`, [userRow.user_id]);
      await conn.commit();

      return {
        outcome: 'ok' as const,
        userId: userRow.user_id,
        email: userRow.user_email,
        personName: userRow.person_name,
        categoryId: userRow.category_id
      };
    }
    catch (error) { if (conn) await conn.rollback(); console.error(error); throw error }
    finally { if (conn) { conn.release() } }
  }
}

export const authRepository = new AuthRepository()

import { connectionPool } from "../services/db";

export class Schedulers {

  static async closeExpiredTests() {

    let conn;
    try {
      conn = await connectionPool.getConnection();
      await conn.beginTransaction();

      const [result] = await conn.query(
        `UPDATE test 
       SET active = 0,
           updatedAt = NOW(),
           updatedByUser = 1
       WHERE active = 1 
         AND endedAt IS NOT NULL
         AND endedAt <= NOW()`
      ) as any;

      if (result.affectedRows > 0) { console.log(`[${new Date().toISOString()}] Testes encerrados automaticamente: ${result.affectedRows}`);}

      await conn.commit();
      return result.affectedRows;
    }
    catch (error) { if (conn) await conn.rollback(); console.error(`[${new Date().toISOString()}] Erro ao encerrar testes:`, error); throw error }
    finally { if (conn) conn.release() }
  }
}
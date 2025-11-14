import { connectionPool } from "../services/db";
import * as schedule from "node-schedule";

export class Schedulers {

  public static async initialize() {
    schedule.scheduleJob('0 5 * * *', async () => {
      try {
        const result = await Schedulers.closeExpiredTests();
        if (result > 0) { console.log(`[${new Date().toISOString()}] ✅ ${ result } teste(s) encerrado(s)`) }
      }
      catch (error) { console.error(`[${new Date().toISOString()}] ❌ Erro ao encerrar testes:`, error) }
    })
  }

  private static async closeExpiredTests() {
    let conn;
    try {
      conn = await connectionPool.getConnection();
      await conn.beginTransaction();

      const query = `
        UPDATE test
        SET active = 0, updatedAt = NOW(), updatedByUser = 1
        WHERE active = 1 AND endedAt IS NOT NULL AND endedAt <= NOW()
      `;

      const [result] = await conn.query(query) as any;

      await conn.commit();
      return result.affectedRows;
    }
    catch (error) { if (conn) await conn.rollback(); console.error(`[${new Date().toISOString()}] Erro ao encerrar testes:`, error); throw error }
    finally { if (conn) conn.release() }
  }

  public static async shutdown() { await schedule.gracefulShutdown() }
}
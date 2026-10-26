import { qYear } from "../interfaces/interfaces";
import { connectionPool } from "../services/db";
import { toSqlUtcDateTime } from "../utils/sqlDateTime";

class YearRepository {

  async qCurrentYear() {
    let conn;
    try {
      conn = await connectionPool.getConnection();
      const query =

        `
        SELECT *
        FROM year
        WHERE year.endedAt IS NULL AND year.active = 1
      `

      const [ queryResult ] = await conn.query(query)
      return (queryResult as qYear[])[0]
    }
    catch (error) { console.error(error); throw error }
    finally { if (conn) { conn.release() } }
  }

  // Índices esperados: year(name)
  async qYearsWithPeriods(search: string) {
    let conn;
    try {
      conn = await connectionPool.getConnection();
      const query = `
        SELECT
            y.id AS year_id, y.name AS year_name, y.active AS year_active, y.createdAt AS year_createdAt, y.endedAt AS year_endedAt,
            p.id AS period_id,
            b.id AS bimester_id, b.name AS bimester_name, b.testName AS bimester_testName
        FROM year AS y
        LEFT JOIN period AS p ON p.yearId = y.id
        LEFT JOIN bimester AS b ON p.bimesterId = b.id
        WHERE y.name LIKE ?
        ORDER BY y.name DESC, b.id ASC
      `
      const [ queryResult ] = await conn.query(query, [`%${search}%`])
      return queryResult as any[]
    }
    catch (error) { console.error(error); throw error }
    finally { if (conn) { conn.release() } }
  }

  // Índices esperados: year(name) [unique], bimester(id), period(yearId, bimesterId)
  async qCreateYear(name: string, createdAt: Date, endedAt: Date | null, active: boolean) {
    let conn;
    try {
      conn = await connectionPool.getConnection();
      await conn.beginTransaction();

      const [ dupRows ] = await conn.query(`SELECT id, name FROM year WHERE name = ? LIMIT 1`, [name]);
      if ((dupRows as any[])[0]) { await conn.commit(); return { outcome: 'duplicate' as const } }

      const [ activeRows ] = await conn.query(`SELECT id, name FROM year WHERE active = 1 AND endedAt IS NULL LIMIT 1 FOR UPDATE`);
      const currentYear = (activeRows as any[])[0];
      if (currentYear && active) { await conn.commit(); return { outcome: 'active_year_exists' as const, name: currentYear.name } }

      const [ maxRows ] = await conn.query(`SELECT MAX(CAST(name AS UNSIGNED)) AS maxYearName FROM year`);
      const newName = (Number((maxRows as any[])[0].maxYearName) + 1).toString();

      const [ yearResult ]: any = await conn.query(
        `INSERT INTO year (name, active, createdAt, endedAt) VALUES (?, ?, ?, ?)`,
        [newName, true, toSqlUtcDateTime(createdAt), toSqlUtcDateTime(endedAt)]
      );
      const yearId = yearResult.insertId;

      const [ bimesters ] = await conn.query(`SELECT id FROM bimester`);
      for (const b of (bimesters as any[])) {
        await conn.query(`INSERT INTO period (yearId, bimesterId) VALUES (?, ?)`, [yearId, b.id]);
      }

      await conn.commit();
      return { outcome: 'created' as const, id: yearId, name: newName };
    }
    catch (error) { if (conn) await conn.rollback(); console.error(error); throw error }
    finally { if (conn) { conn.release() } }
  }

  // Índices esperados: year(name) [unique], student_classroom(yearId, endedAt), transfer(yearId, statusId)
  async qUpdateYear(id: number, body: { name: string, active: boolean, createdAt: Date | string, endedAt: Date | string | null }, receiverTeacherId: number, pendingStatusId: number, acceptedStatusId: number) {
    let conn;
    try {
      conn = await connectionPool.getConnection();
      await conn.beginTransaction();

      const [ yearRows ] = await conn.query(`SELECT id, name, active, createdAt, endedAt FROM year WHERE id = ? LIMIT 1 FOR UPDATE`, [id]);
      const yearToUpdate = (yearRows as any[])[0];
      if (!yearToUpdate) { await conn.commit(); return { outcome: 'not_found' as const } }

      const [ dupRows ] = await conn.query(`SELECT id, name FROM year WHERE name = ? AND id != ? LIMIT 1`, [body.name, id]);
      if ((dupRows as any[])[0]) { await conn.commit(); return { outcome: 'duplicate' as const } }

      const [ activeRows ] = await conn.query(`SELECT id, name FROM year WHERE active = 1 AND endedAt IS NULL LIMIT 1 FOR UPDATE`);
      const currentYear = (activeRows as any[])[0];
      if (currentYear && body.active) { await conn.commit(); return { outcome: 'active_conflict' as const, name: currentYear.name } }

      const merged = { ...yearToUpdate, ...body };

      if (!merged.active && (merged.endedAt === '' || merged.endedAt === null)) {
        await conn.commit();
        return { outcome: 'ended_at_required' as const };
      }

      if (!merged.active && merged.endedAt) {
        const cascadeNow = toSqlUtcDateTime(new Date());

        await conn.query(`UPDATE student_classroom SET endedAt = ? WHERE yearId = ? AND endedAt IS NULL`, [cascadeNow, id]);

        const [ pendingTransfers ] = await conn.query(`SELECT id FROM transfer WHERE yearId = ? AND statusId = ?`, [id, pendingStatusId]);
        for (const t of (pendingTransfers as any[])) {
          await conn.query(
            `UPDATE transfer SET statusId = ?, endedAt = ?, receiverId = ? WHERE id = ?`,
            [acceptedStatusId, cascadeNow, receiverTeacherId, t.id]
          );
        }
      }

      await conn.query(
        `UPDATE year SET name = ?, active = ?, createdAt = ?, endedAt = ? WHERE id = ?`,
        [merged.name, merged.active, toSqlUtcDateTime(merged.createdAt), toSqlUtcDateTime(merged.endedAt), id]
      );
      await conn.commit();

      if (typeof merged.createdAt === 'string') { merged.createdAt = new Date(merged.createdAt) }
      if (typeof merged.endedAt === 'string' && merged.endedAt !== '') { merged.endedAt = new Date(merged.endedAt) }

      return { outcome: 'updated' as const, data: merged };
    }
    catch (error) { if (conn) await conn.rollback(); console.error(error); throw error }
    finally { if (conn) { conn.release() } }
  }

  async qYearByName(yearName: string) {
    if (!yearName || yearName.trim() === '') { throw new Error('Nome do ano é obrigatório') }

    let year: qYear | undefined;
    let conn;

    try {
      conn = await connectionPool.getConnection();
      const query = `SELECT y.id, y.name FROM year AS y WHERE y.name = ?`;
      const [queryResult] = await conn.query(query, [yearName]);

      year = (queryResult as qYear[])[0];
    }
    catch (error) { console.error(error); throw error }
    finally { if (conn) { conn.release() } }

    if (!year) { year = await this.qCurrentYear() }

    return year;
  }

  async qYearById(yearId: number | string) {
    let conn;
    try {
      conn = await connectionPool.getConnection();
      const query =

        `
        SELECT y.id, y.name
        FROM year AS y
        WHERE y.id = ?
      `

      const [ queryResult ] = await conn.query(query, [yearId])
      return (queryResult as qYear[])[0]
    }
    catch (error) { console.error(error); throw error }
    finally { if (conn) { conn.release() } }
  }
}

export const yearRepository = new YearRepository()

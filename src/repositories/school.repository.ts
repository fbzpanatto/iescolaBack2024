import { qSchools } from "../interfaces/interfaces";
import { connectionPool } from "../services/db";

class SchoolRepository {

  // ------------------ PURE SQL QUERIES ------------------------------------------------------------------------------------

  async qGetAllSchools(year: string, search: string) {

    let conn;
    try {
      conn = await connectionPool.getConnection();

      const searchTerm = search ? `%${search}%` : null;

      const sqlQuery = `
        WITH target_year AS (SELECT id FROM year WHERE name = ?),
        school_stats AS (
          SELECT
            CAST(s.id AS CHAR) as id, 
            s.name,
            COALESCE(SUM(CASE WHEN sc.endedAt IS NULL THEN 1 ELSE 0 END), 0) as activeStudents,
            COALESCE(SUM(CASE WHEN sc.endedAt IS NOT NULL THEN 1 ELSE 0 END), 0) as inactiveStudents
          FROM school s
          INNER JOIN classroom c ON c.schoolId = s.id
          INNER JOIN student_classroom sc ON sc.classroomId = c.id
          INNER JOIN target_year ty ON sc.yearId = ty.id
          WHERE
            (? IS NULL OR (s.name LIKE ? OR s.shortName LIKE ?))
          GROUP BY s.id, s.name
        ),
        total_stats AS (
          SELECT
            '--' as id,
            'PREFEITURA DO MUNICÍPIO DE ITATIBA' as name,
            COALESCE(SUM(activeStudents), 0) as activeStudents,
            COALESCE(SUM(inactiveStudents), 0) as inactiveStudents,
            1 as sort_priority
          FROM school_stats
        )
        
        SELECT id, name, activeStudents, inactiveStudents, sort_priority FROM total_stats
        UNION ALL
        SELECT id, name, activeStudents, inactiveStudents, 2 as sort_priority FROM school_stats
        ORDER BY sort_priority ASC, activeStudents DESC
        `;

      const [ queryResult ] = await conn.query(sqlQuery, [year, searchTerm, searchTerm, searchTerm]);

      return (queryResult as any[]).map(row => ({
        id: row.id,
        name: row.name,
        activeStudents: Number(row.activeStudents),
        inactiveStudents: Number(row.inactiveStudents)
      }));
    }
    catch (error) { console.error(error); throw error }
    finally { if (conn) { conn.release() } }
  }

  async qSchools(testId: number) {
    let conn;
    try{

      conn = await connectionPool.getConnection();

      const query =

        `
        SELECT s.id, s.shortName, s.name 
        FROM school AS s
        WHERE EXISTS
          (
            SELECT 1 
            FROM classroom AS c
              INNER JOIN test_classroom AS tc ON c.id = tc.classroomId
            WHERE tc.testId = ? AND s.id = c.schoolId AND s.id NOT IN (?)
          )
        ORDER BY s.shortName
      `

      const [ queryResult ] = await conn.query(query, [testId, [28, 29]])
      return queryResult as qSchools[]

    }
    catch (error) { console.error(error); throw error }
    finally { if (conn) { conn.release() } }
  }

  async qTestSchools(testId: number | string) {
    let conn;
    try {
      conn = await connectionPool.getConnection();
      const query = `
      SELECT 
        c.id AS classroom_id,
        c.name AS classroom_name,
        c.shortName AS classroom_shortName,
        s.id AS school_id,
        s.name AS school_name,
        s.shortName AS school_shortName
      FROM test_classroom tc
      INNER JOIN classroom c ON c.id = tc.classroomId
      INNER JOIN school s ON s.id = c.schoolId
      WHERE tc.testId = ?
        AND s.id NOT IN (28, 29)
        AND c.id NOT IN (1216, 1217, 1218, 1509)
        AND NOT EXISTS (
          SELECT 1 FROM student_test_status sts
          INNER JOIN student_classroom sc ON sc.id = sts.studentClassroomId
          WHERE sc.classroomId = c.id AND sts.testId = tc.testId
        )
    `
      const [rows] = await conn.query(query, [testId])
      return rows as { classroom_id: number, classroom_name: string, classroom_shortName: string, school_id: number, school_name: string, school_shortName: string }[]
    }
    catch (error) { console.error(error); throw error }
    finally { if (conn) { conn.release() } }
  }
}

export const schoolRepository = new SchoolRepository()

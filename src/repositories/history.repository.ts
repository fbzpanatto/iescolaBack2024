import { qStudentTests } from "../interfaces/interfaces";
import { connectionPool } from "../services/db";

class HistoryRepository {

  async qCurrentTeacherStudents(yearId: number, classrooms: number[], student: string | number, masterTeacher: boolean, limit: number, offset: number) {
    let conn;
    try {
      conn = await connectionPool.getConnection();
      const studentSearch = `%${student.toString().toUpperCase()}%`

      if(masterTeacher) {
        let query = `
          SELECT sc.id AS studentClassroomId, stu.id AS studentId, per.name
          FROM student_classroom AS sc
            INNER JOIN student AS stu ON sc.studentId = stu.id
            INNER JOIN person AS per ON stu.personId = per.id
          WHERE (per.name LIKE ? OR stu.ra LIKE ?) AND sc.yearId = ?
          LIMIT ? OFFSET ?
        `
        const [ queryResult ] = await conn.query(query, [studentSearch, studentSearch, yearId, limit, offset])
        return queryResult as { studentClassroomId: number, studentId: number, name: string }[]
      }

      let query = `
        SELECT DISTINCT sc.id, stu.id AS studentId, per.name
        FROM student_classroom AS sc
        INNER JOIN student AS stu ON sc.studentId = stu.id
        INNER JOIN person AS per ON stu.personId = per.id
        WHERE (per.name LIKE ? OR stu.ra LIKE ?) 
        AND sc.classroomId IN (?) 
        AND (sc.endedAt IS NULL OR sc.yearId = ?)
        LIMIT ? OFFSET ?
      `

      const [ queryResult ] = await conn.query(query, [studentSearch, studentSearch, classrooms, yearId, limit, offset])
      return queryResult as { id: number, studentId: number, name: string }[]
    }
    catch (error) { console.error(error); throw error }
    finally { if (conn) { conn.release() } }
  }

  async qStudentTestsByYear(studentIds: number[], yearId: number) {
    let conn;
    try {
      conn = await connectionPool.getConnection();
      const query = `
          SELECT
              sc.id AS studentClassroomId, stu.id AS studentId, per.name AS studentName,
              cls.id AS classroomId, cls.shortName AS classroomName, sch.shortName AS schoolName,
              tt.id AS testId, tt.name AS testName, br.name AS bimesterName,
              br.testName AS bimesterTestName, yr.name AS yearName, ttc.id AS testCategoryId,
              stu.ra, stu.dv
          FROM student_test_status AS sts
                   INNER JOIN student_classroom AS sc ON sts.studentClassroomId = sc.id
                   INNER JOIN classroom AS cls ON sc.classroomId = cls.id
                   INNER JOIN school AS sch ON cls.schoolId = sch.id
                   INNER JOIN student AS stu ON sc.studentId = stu.id
                   INNER JOIN person AS per ON stu.personId = per.id
                   INNER JOIN test AS tt ON sts.testId = tt.id
                   INNER JOIN test_category AS ttc ON tt.categoryId = ttc.id
                   INNER JOIN period AS pr ON tt.periodId = pr.id
                   INNER JOIN year AS yr ON pr.yearId = yr.id
                   INNER JOIN bimester AS br ON pr.bimesterId = br.id
          WHERE
              stu.id IN (?)
            AND yr.id = ?
            AND sc.yearId = yr.id
      `;

      const [ queryResult ] = await conn.query(query, [studentIds, yearId]);

      return queryResult as qStudentTests[];
    }
    catch (error) { console.error(error); throw error }
    finally { if (conn) { conn.release() } }
  }

  async qStudentAlphabeticByYear(studentIds: number[], yearId: number) {
    let conn;
    try {
      conn = await connectionPool.getConnection();
      const query = `
          SELECT
              sc.id AS studentClassroomId, stu.id AS studentId, per.name AS studentName,
              cls.id AS classroomId, cls.shortName AS classroomName, sch.shortName AS schoolName,
              tt.id AS testId, tt.name AS testName, br.name AS bimesterName,
              br.testName AS bimesterTestName, yr.name AS yearName, ttc.id AS testCategoryId,
              stu.ra, stu.dv
          FROM alphabetic AS alpha
                   INNER JOIN student AS stu ON alpha.studentId = stu.id
                   INNER JOIN student_classroom AS sc ON stu.id = sc.studentId
                   INNER JOIN classroom AS cls ON sc.classroomId = cls.id
                   INNER JOIN school AS sch ON cls.schoolId = sch.id
                   INNER JOIN person AS per ON stu.personId = per.id
                   LEFT JOIN test AS tt ON alpha.testId = tt.id
                   LEFT JOIN test_category AS ttc ON tt.categoryId = ttc.id
                   LEFT JOIN period AS pr ON tt.periodId = pr.id
                   LEFT JOIN year AS yr ON pr.yearId = yr.id
                   LEFT JOIN bimester AS br ON pr.bimesterId = br.id
          WHERE
              stu.id IN (?)
            AND yr.id = ?
            AND sc.yearId = yr.id
      `;

      const [ queryResult ] = await conn.query(query, [studentIds, yearId]);

      return queryResult as qStudentTests[];
    }
    catch (error) { console.error(error); throw error }
    finally { if (conn) { conn.release() } }
  }
}

export const historyRepository = new HistoryRepository()

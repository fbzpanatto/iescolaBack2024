import { qClassroom, qClassrooms } from "../interfaces/interfaces";
import { Classroom } from "../model/Classroom";
import { CLASSROOM_CATEGORIES, OUT_CLASSROOMS } from "../utils/enums";
import { connectionPool } from "../services/db";
import { Helper } from "../utils/helpers";

class ClassroomRepository {

  async qGetClassroomFullData(id: number) {
    let conn;
    try {
      conn = await connectionPool.getConnection();
      const query =
        `
          SELECT 
            c.id, c.name, c.shortName, c.nickname, c.shiftId, c.categoryId, 
            s.name AS school, 
            sc.rosterNumber, sc.studentId, sc.id AS studentClassroomId,
            p.name AS student, DATE_FORMAT(p.birth, '%d/%m/%Y') AS birth, 
            CONCAT(
              SUBSTRING(LPAD(st.ra, 9, '0'), 1, 3), '.',
              SUBSTRING(LPAD(st.ra, 9, '0'), 4, 3), '.',
              SUBSTRING(LPAD(st.ra, 9, '0'), 7, 3), '-',
              st.dv
            ) AS ra
          FROM classroom AS c
            LEFT JOIN classroom_shift AS cs ON c.shiftId = cs.id
            INNER JOIN classroom_category AS cc ON c.categoryId = cc.id
            INNER JOIN school AS s ON c.schoolId = s.id
            LEFT JOIN student_classroom AS sc ON c.id = sc.classroomId
            LEFT JOIN student AS st ON sc.studentId = st.id
            LEFT JOIN person AS p ON st.personId = p.id
            LEFT JOIN year AS yr ON sc.yearId = yr.id AND yr.active = 1
          WHERE c.id = ? AND sc.endedAt IS NULL
          ORDER BY sc.rosterNumber ASC, p.name ASC;
        `
      const [ queryResult ] = await conn.query(query, [id])

      return Helper.studentsClassrooms((queryResult as Array<{
        id: number,
        name: string,
        shortName: string,
        nickname: string,
        shiftId: number,
        categoryId: number,
        school: string,
        rosterNumber: number,
        student: string,
        birth: string,
        studentId: number,
        ra: string,
        studentClassroomId: number
      }>))
    }
    catch (error) { console.error(error); throw error }
    finally { if (conn) { conn.release() } }
  }

  async qClassroom(classroomId: number) {
    let conn;
    try {
      conn = await connectionPool.getConnection();
      const query =

        `
        SELECT c.id, c.name, c.nickname, c.shortName, s.id AS school_id, s.name AS school_name, s.shortName AS school_shortName
        FROM classroom AS c
          INNER JOIN school AS s ON c.schoolId = s.id
        WHERE c.id = ?
      `

      const [ queryResult ] = await conn.query(query, [classroomId])

      return Helper.classroom((queryResult as qClassroom[])[0])
    }
    catch (error) { console.error(error); throw error }
    finally { if (conn) { conn.release() } }
  }

  async qClassroomsByTestId(schoolId: number, testId: number) {
    let conn;
    try {

      conn = await connectionPool.getConnection();

      const query =

        `
        SELECT c.id, c.shortName 
        FROM classroom AS c
          INNER JOIN test_classroom AS tc ON c.id = tc.classroomId
        WHERE schoolId = ? AND tc.testId = ? AND c.id NOT IN (?)
      `

      const [ queryResult ] = await conn.query(query, [schoolId, testId, OUT_CLASSROOMS])
      return queryResult as qClassrooms[]

    }
    catch (error) { console.error(error); throw error }
    finally { if (conn) { conn.release() } }
  }

  async qUpdateClassroom(classroomId: number, nickname: string, shiftId: number) {
    let conn;
    try {
      conn = await connectionPool.getConnection();
      await conn.beginTransaction();

      const query =
        `
          UPDATE classroom 
          SET nickname = ?, shiftId = ?
          WHERE id = ?
        `;

      const [ queryResult ] = await conn.query(query, [nickname, shiftId, classroomId]);

      await conn.commit();
      return queryResult as any;
    }
    catch (error) { if(conn) await conn.rollback(); console.error(error); throw error }
    finally { if (conn) { conn.release() } }
  }

  async qUpdateStudentRosters(studentsChanges: any[], userId: number) {

    if (!studentsChanges || studentsChanges.length === 0) return true;

    let conn;
    try {
      conn = await connectionPool.getConnection();
      await conn.beginTransaction();

      const ids = studentsChanges.map(change => change.studentClassroomId);

      let caseStatement = 'CASE id ';
      const queryParams: any[] = [];

      studentsChanges.forEach(change => {
        caseStatement += 'WHEN ? THEN ? ';
        queryParams.push(change.studentClassroomId, change.rosterNumber);
      });
      caseStatement += 'END';

      const query = `
        UPDATE student_classroom 
        SET rosterNumber = ${caseStatement}, 
            updatedByUser = ?
        WHERE id IN (?)
        `;

      queryParams.push(userId, ids);

      await conn.query(query, queryParams);

      await conn.commit();
      return true;
    }
    catch (error) { if(conn) await conn.rollback(); console.error(error); throw error }
    finally { if (conn) { conn.release() } }
  }

  async qNumberClassrooms() {
    let conn;
    try {
      conn = await connectionPool.getConnection();
      const query =
        `
          SELECT DISTINCT CAST(LEFT(shortName, 1) AS UNSIGNED) AS classroom_number, cc.id AS categoryId, cc.name AS categoryName
          FROM classroom AS c
                   INNER JOIN classroom_category AS cc ON c.categoryId = cc.id
          WHERE c.active = 1
            AND CAST(LEFT(c.shortName, 1) AS UNSIGNED) BETWEEN 0 AND 9
          ORDER BY classroom_number
      `
      const [ queryResult ] = await conn.query(query)
      return  queryResult as Array<any>
    }
    catch (error) { console.error(error); throw error }
    finally { if (conn) { conn.release() } }
  }

  async getTeacherClassrooms(isSuperEI: boolean, masterUser: boolean, allClassrooms: number[], search: string, limit: number, offset: number, active: boolean) {
    let conn;
    try {
      conn = await connectionPool.getConnection();

      if (!masterUser && allClassrooms.length === 0) { return { status: 200, data: [] } }

      let query = `
      SELECT
        classroom.id AS id,
        classroom.shortName AS name,
        classroom.nickname AS nickname,
        school.shortName AS school
      `;

      if (active) {
        query += `,
        classroom_shift.name AS shift,
        (SELECT COUNT(sc.id) 
         FROM student_classroom sc 
         WHERE sc.classroomId = classroom.id 
           AND sc.startedAt IS NOT NULL 
           AND sc.endedAt IS NULL
      ) AS activeStudentsCount
      `;
      }

      query += ` FROM classroom LEFT JOIN school ON classroom.schoolId = school.id`;

      if (active) { query += ` LEFT JOIN classroom_shift ON classroom.shiftId = classroom_shift.id` }

      query += ` WHERE 1=1 `;

      const params: any[] = [];

      if (!masterUser) {
        query += ` AND classroom.id IN (?)`;
        params.push(allClassrooms);
      }
      else { if (isSuperEI) { query += ` AND classroom.categoryId = ${CLASSROOM_CATEGORIES.EI}` } }

      if (active) {
        query += ` AND EXISTS (
        SELECT 1 
        FROM student_classroom sc 
        WHERE sc.classroomId = classroom.id 
          AND sc.startedAt IS NOT NULL 
          AND sc.endedAt IS NULL
      )`;
      }

      if (search && search.trim() !== '') {
        const searchOriginal = search.trim();

        const classroomRegex = /\b(\d+[A-Za-z]+)\b/;
        const match = searchOriginal.match(classroomRegex);

        let searchTermCleaned = searchOriginal;
        let specificClassroomFilter = "";

        if (match) {
          const foundClassroom = match[0];
          searchTermCleaned = searchOriginal.replace(foundClassroom, '').trim();
          specificClassroomFilter = ` AND classroom.shortName COLLATE utf8mb4_unicode_ci LIKE ? `;
        }

        if (searchTermCleaned.length > 0) {
          query += ` AND (classroom.shortName COLLATE utf8mb4_unicode_ci LIKE ? OR school.shortName COLLATE utf8mb4_unicode_ci LIKE ?)`;
          const searchParam = `%${searchTermCleaned}%`;
          params.push(searchParam, searchParam);
        }

        if (specificClassroomFilter) {
          query += specificClassroomFilter;
          if (match) { params.push(`%${match[0]}%`) }
        }
      }

      query += ` ORDER BY school.shortName ASC, classroom.shortName ASC`;

      // ALTERAÇÃO AQUI: Só aplica paginação se NÃO for masterUser
      if (!masterUser) {
        query += ` LIMIT ? OFFSET ?`;
        params.push(Number(limit), Number(offset));
      }

      const [queryResult] = await conn.query(query, params);

      return queryResult as Array<Classroom>;
    }
    catch (error) { console.error(error); throw error }
    finally { if (conn) { conn.release() } }
  }

  async getTeacherClassroomsByTestCategory(masterUser: boolean, allClassrooms: number[], classroomStartNumber: number, classroomEndNumber: number) {
    let conn;
    try {
      conn = await connectionPool.getConnection();

      let query = `
        SELECT
          classroom.id AS id,
          classroom.shortName AS name,
          school.shortName AS school
        FROM classroom
         LEFT JOIN school ON classroom.schoolId = school.id
        WHERE CAST(LEFT(classroom.shortName, 1) AS UNSIGNED) BETWEEN ? AND ?
      `;
      const params: any[] = [classroomStartNumber, classroomEndNumber];

      if (!masterUser) {
        if (allClassrooms.length === 0) { return { status: 200, data: [] }; }
        query += ` AND classroom.id IN (?)`;
        params.push(allClassrooms);
      }
      else { query += ` AND classroom.id > 0` }

      const [queryResult] = await conn.query(query, params);

      return queryResult as Array<{ id: number, name: string, school: string }>;
    }
    catch (error) {console.error(error); throw error }
    finally { if (conn) { conn.release() } }
  }
}

export const classroomRepository = new ClassroomRepository()

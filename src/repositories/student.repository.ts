import { InactiveNewClassroom, qStudentClassroomFormated, qUserTeacher, qYear, StudentClassroomFnOptions, StudentClassroomReturn } from "../interfaces/interfaces";
import { CLASSROOM_CATEGORIES, IS_OWNER } from "../utils/enums";
import { connectionPool } from "../services/db";
import { Helper } from "../utils/helpers";

class StudentRepository {

  async qLastRegister(studentId: number, yearId: number) {
    let conn;
    try {
      conn = await connectionPool.getConnection();
      const query =

        `
        SELECT stu.id AS studentId, per.name AS personName, sc.id AS studentClassroomId, sc.rosterNumber, sc.startedAt, sc.endedAt, sc.classroomId, sc.yearId, sc.studentId AS studentIdSc
        FROM student AS stu
        INNER JOIN person AS per ON stu.personId = per.id
        INNER JOIN student_classroom AS sc ON stu.id = sc.studentId
        INNER JOIN classroom AS clas ON sc.classroomId = clas.id
        INNER JOIN school AS sch ON clas.schoolId = sch.id
        INNER JOIN year AS y ON sc.yearId = y.id
        WHERE 
          sc.endedAt IS NOT NULL AND
          stu.id = ? AND
          y.id = ? AND
          sc.endedAt = (SELECT MAX(sc2.endedAt) FROM student_classroom AS sc2 WHERE sc2.studentId = stu.id AND sc2.yearId = ?)
      `

      const [ queryResult ] = await conn.query(query, [studentId, yearId, yearId])

      return (queryResult as { [key: string]: any }[])
    }
    catch (error) { console.error(error); throw error }
    finally { if (conn) { conn.release() } }
  }

  async qStudentDisabilities(arr: { [key: string]: any }[]) {
    let conn;
    try {
      conn = await connectionPool.getConnection();
      const studentIds = arr.map(item => item.student.id).filter(id => id);

      if (studentIds.length === 0) { return arr }

      const placeholders = studentIds.map(() => '?').join(',');
      const query = `
      SELECT 
        sd.id, sd.studentId, sd.startedAt, sd.endedAt, 
        d.id as disability_id, d.name as disability_name, d.official as disability_official
      FROM student_disability AS sd
      INNER JOIN disability AS d ON sd.disabilityId = d.id
      WHERE sd.studentId IN (${placeholders}) AND sd.endedAt IS NULL
    `;

      const [queryResult] = await conn.query(query, studentIds);

      return Helper.studentDisabilities(queryResult as Array<any>, arr);
    }
    catch (error) { console.error(error); throw error }
    finally { if (conn) { conn.release() } }
  }

  async studentsClassroomsNewImplementation(options: StudentClassroomFnOptions, masterUser: boolean, isSuperEI: boolean, limit: number, offset: number) {
    let conn;
    try {
      conn = await connectionPool.getConnection();

      let yearName = options?.year;

      if (!yearName || yearName.length !== 4) {
        const [yearResult] = await conn.query(
          `SELECT name FROM year WHERE active = 1 ORDER BY id DESC LIMIT 1`
        );
        if ((yearResult as any[]).length > 0) {
          yearName = (yearResult as any[])[0].name;
        }
      }

      const isOwner = options.owner === IS_OWNER.OWNER;
      const params: any[] = [];
      const searchOriginal = options.search || '';

      const classroomRegex = /\b(\d+[A-Za-z]+)\b/;
      const match = searchOriginal.match(classroomRegex);

      let specificClassroomFilter = "";
      let searchTermCleaned = searchOriginal;

      if (match) {
        const foundClassroom = match[0];

        searchTermCleaned = searchOriginal.replace(foundClassroom, '').trim();

        specificClassroomFilter = ` AND c.shortName LIKE ? `;
      }

      params.push(yearName);

      const searchParam = `%${searchTermCleaned}%`;

      params.push(searchParam, searchParam, searchParam, searchParam, searchParam);

      if (specificClassroomFilter) { params.push(`%${match![0]}%`) }

      let classroomPermissionSQL = "";
      const teacherClassroomIds = options.teacherClasses?.classrooms || [];

      if (!masterUser) {
        if (teacherClassroomIds.length > 0) {
          const placeholders = teacherClassroomIds.map(() => '?').join(',');
          if (isOwner) { classroomPermissionSQL = `AND c.id IN (${placeholders})` }
          else { classroomPermissionSQL = `AND c.id NOT IN (${placeholders})` }
          params.push(...teacherClassroomIds);
        }
        else if (isOwner) { classroomPermissionSQL = `AND 1 = 0` }
      }
      else { if (isSuperEI) { classroomPermissionSQL = ` AND c.categoryId = ${CLASSROOM_CATEGORIES.EI}` } }

      params.push(limit, offset);

      const query = `
      SELECT 
        sc.id AS studentClassroom_id, 
        sc.startedAt AS studentClassroom_startedAt, 
        
        s.id AS student_id, 
        s.ra AS student_ra, 
        s.dv AS student_dv, 
        
        st.id AS state_id, 
        st.acronym AS state_acronym, 
        
        p.id AS person_id, 
        p.name AS person_name, 
        p.birth AS person_birth, 
        
        c.id AS classroom_id, 
        c.shortName AS classroom_shortName, 
        
        sch.id AS school_id, 
        sch.shortName AS school_shortName, 
        
        t.id AS transfers_id, 
        t.startedAt AS transfers_startedAt, 
        
        tp.name AS requesterPerson_name, 
        ts.name AS transfersStatus_name, 
        
        rc.shortName AS requestedClassroom_shortName, 
        rcs.shortName AS requestedClassroomSchool_shortName
  
      FROM student s
        LEFT JOIN person p ON s.personId = p.id
        LEFT JOIN state st ON s.stateId = st.id
        
        LEFT JOIN transfer t ON s.id = t.studentId AND t.endedAt IS NULL
        LEFT JOIN transfer_status ts ON t.statusId = ts.id
        LEFT JOIN classroom rc ON t.requestedClassroomId = rc.id
        LEFT JOIN school rcs ON rc.schoolId = rcs.id
        LEFT JOIN teacher rq ON t.requesterId = rq.id
        LEFT JOIN person tp ON rq.personId = tp.id
        
        LEFT JOIN student_classroom sc ON s.id = sc.studentId AND sc.endedAt IS NULL
        LEFT JOIN classroom c ON sc.classroomId = c.id
        LEFT JOIN school sch ON c.schoolId = sch.id
        LEFT JOIN year y ON sc.yearId = y.id
  
      WHERE y.name = ?
        AND (
          p.name COLLATE utf8mb4_unicode_ci LIKE ? 
          OR s.ra LIKE ? 
          OR c.shortName LIKE ? 
          OR sch.name LIKE ? 
          OR sch.shortName LIKE ?
        )
        ${specificClassroomFilter} 
        ${classroomPermissionSQL}
  
      ORDER BY 
        ts.id DESC, 
        sch.shortName ASC, 
        c.shortName ASC, 
        sc.rosterNumber ASC, 
        p.name ASC
      
      LIMIT ? OFFSET ?
    `;

      const [rows] = await conn.query(query, params);

      return (rows as any[]).map((item) => ({
        id: item.studentClassroom_id,
        startedAt: item.studentClassroom_startedAt,
        classroom: {
          id: item.classroom_id,
          shortName: item.classroom_shortName,
          teacher: options.teacherClasses,
          school: { shortName: item.school_shortName }
        },
        student: {
          id: item.student_id,
          ra: item.student_ra,
          dv: item.student_dv,
          state: { acronym: item.state_acronym },
          person: { name: item.person_name, birth: item.person_birth },
          transfer: item.transfers_id ? {
            id: item.transfers_id,
            startedAt: item.transfers_startedAt,
            status: { name: item.transfersStatus_name },
            requester: { name: item.requesterPerson_name },
            requestedClassroom: {
              classroom: item.requestedClassroom_shortName,
              school: item.requestedClassroomSchool_shortName
            }
          } : false,
        },
      })) as StudentClassroomReturn[];
    }
    catch (error) { console.error(error); throw error }
    finally { if (conn) { conn.release() } }
  }

  async qGetAllInactivates(search: string, year: any, currentYearId: any, lastYearId: any, limit: number, offset: number) {

    let conn;

    try {

      conn = await connectionPool.getConnection();

      const query = `
      SELECT 
        stu.id AS student_id,
        stu.ra AS student_ra,
        stu.dv AS student_dv,
        stu.observationOne AS student_observationOne,
        stu.observationTwo AS student_observationTwo,
        stu.active AS student_active,
        
        per.id AS person_id,
        per.name AS person_name,
        per.birth AS person_birth,
        
        stt.id AS state_id,
        stt.name AS state_name,
        stt.acronym AS state_acronym,
        
        sc.id AS sc_id,
        sc.rosterNumber AS sc_rosterNumber,
        sc.startedAt AS sc_startedAt,
        sc.endedAt AS sc_endedAt,
        
        cla.id AS classroom_id,
        cla.name AS classroom_name,
        cla.shortName AS classroom_shortName,
        
        sch.id AS school_id,
        sch.name AS school_name,
        sch.shortName AS school_shortName,
        sch.inep AS school_inep,
        sch.active AS school_active,
        
        yr.id AS year_id,
        yr.name AS year_name,
        yr.active AS year_active

      FROM student stu
      LEFT JOIN person per ON stu.personId = per.id
      LEFT JOIN state stt ON stu.stateId = stt.id
      LEFT JOIN student_classroom sc ON sc.studentId = stu.id
      LEFT JOIN classroom cla ON sc.classroomId = cla.id
      LEFT JOIN school sch ON cla.schoolId = sch.id
      LEFT JOIN year yr ON sc.yearId = yr.id
      
      WHERE sc.endedAt IS NOT NULL
        AND stu.active = 1
        AND (
          per.name COLLATE utf8mb4_unicode_ci LIKE ? OR
          stu.ra LIKE ? OR
          sch.shortName COLLATE utf8mb4_unicode_ci LIKE ? OR
          sch.name COLLATE utf8mb4_unicode_ci LIKE ?
        )
        AND yr.name = ?
        AND NOT EXISTS (
          SELECT 1 FROM student_classroom sc1 
          WHERE sc1.studentId = stu.id 
            AND sc1.yearId = ? 
            AND sc1.endedAt IS NULL
        )
        AND sc.endedAt = (
          SELECT MAX(sc2.endedAt) FROM student_classroom sc2 
          WHERE sc2.studentId = stu.id 
            AND sc2.yearId <= ?
        )
      ORDER BY sch.shortName ASC, cla.shortName ASC, sc.rosterNumber ASC
      LIMIT ? OFFSET ?;
    `;

      const queryParams = [search, search, search, search, year, currentYearId, lastYearId, limit, offset];

      const [rows] = await conn.query(query, queryParams) as Array<any>;
      return rows;
    }
    catch (error) { console.error(error); throw error }
    finally { if (conn) { conn.release() } }
  }

  // Índices esperados: student_classroom(studentId) [existe], classroom(schoolId) [existe],
  // student_disability(studentId) [existe]. Assume no máximo 1 student_classroom ativo por
  // aluno (regra de negócio já garantida em outro lugar) — se houver mais de um, LIMIT 1
  // pega um arbitrário, igual o groupBy+getRawOne do TypeORM original fazia.
  async qStudentFullDetail(studentId: number) {
    let conn;
    try {
      conn = await connectionPool.getConnection();
      const query = `
        SELECT
          s.id AS student_id, s.ra AS student_ra, s.dv AS student_dv,
          s.observationOne AS student_observationOne, s.observationTwo AS student_observationTwo,
          st.id AS state_id, st.acronym AS state_acronym,
          p.id AS person_id, p.name AS person_name, p.birth AS person_birth,
          sc.id AS studentClassroom_id, sc.rosterNumber AS studentClassroom_rosterNumber,
          sc.startedAt AS studentClassroom_startedAt, sc.endedAt AS studentClassroom_endedAt,
          c.id AS classroom_id, c.shortName AS classroom_shortName,
          sch.id AS school_id, sch.shortName AS school_shortName,
          (
            SELECT GROUP_CONCAT(DISTINCT sd.disabilityId ORDER BY sd.disabilityId ASC)
            FROM student_disability AS sd
            WHERE sd.studentId = s.id AND sd.endedAt IS NULL
          ) AS disabilities
        FROM student AS s
          LEFT JOIN person AS p ON p.id = s.personId
          LEFT JOIN state AS st ON st.id = s.stateId
          LEFT JOIN student_classroom AS sc ON sc.studentId = s.id AND sc.endedAt IS NULL
          LEFT JOIN classroom AS c ON c.id = sc.classroomId
          LEFT JOIN school AS sch ON sch.id = c.schoolId
        WHERE s.id = ?
        LIMIT 1
      `
      const [ queryResult ] = await conn.query(query, [studentId])
      return (queryResult as any[])[0]
    }
    catch (error) { console.error(error); throw error }
    finally { if (conn) { conn.release() } }
  }

  async graduateStudentsBatchSQL(body: {list: InactiveNewClassroom[], user: qUserTeacher, year: qYear }) {
    let conn;
    try {
      conn = await connectionPool.getConnection();
      await conn.beginTransaction();

      const { list, user, year } = body;

      if (!list || list.length === 0) { throw new Error("Nenhum aluno para formar.") }

      const teacherId = user.id;
      const userId = user.person.user.id;

      const studentIds = list.map(item => item.student.id);
      const now = new Date();

      const updateQuery = `
      UPDATE student 
      SET active = 0, 
          updatedByUser = ?, 
          updatedAt = ? 
      WHERE id IN (?)
    `;

      await conn.query(updateQuery, [userId, now, studentIds]);

      const transferStatusFormado = 6;

      const valuesToInsert = list.map(item => [
        transferStatusFormado,      // statusId
        year.id,                       // yearId
        item.student.id,            // studentId
        teacherId,                  // requesterId
        teacherId,                  // receiverId
        item.oldClassroom.id,       // requestedClassroomId
        item.oldClassroom.id,       // currentClassroomId
        now,                        // startedAt
        now,                        // endedAt
        userId,                     // createdByUser
        userId                      // updatedByUser
      ]);

      const insertQuery = `
      INSERT INTO transfer (
        statusId, 
        yearId, 
        studentId, 
        requesterId, 
        receiverId, 
        requestedClassroomId, 
        currentClassroomId, 
        startedAt, 
        endedAt, 
        createdByUser, 
        updatedByUser
      ) VALUES ?
    `;

      await conn.query(insertQuery, [valuesToInsert]);

      await conn.commit();

      return { status: 201, message: `${list.length} alunos processados com sucesso.` };
    }
    catch (error) { if (conn) await conn.rollback(); console.error("Erro no graduateStudentsBatchSQL:", error);throw error }
    finally { if (conn) conn.release() }
  }

  async qStudentClassrooms(classroomId: number, yearId: number) {
    let conn;
    try {
      conn = await connectionPool.getConnection();

      const query =

        `
        SELECT sc.id, sc.rosterNumber, sc.classroomId, sc.startedAt, sc.endedAt, s.id AS student_id, p.id AS person_id, p.name AS person_name
        FROM student_classroom AS sc
          INNER JOIN student AS s ON sc.studentId = s.id
          INNER JOIN person AS p ON s.personId = p.id
        WHERE sc.classroomId = ? AND sc.yearId = ?
      `

      const [ queryResult ] = await conn.query(query, [classroomId, yearId])
      return  Helper.studentClassroom(queryResult as Array<qStudentClassroomFormated>)

    }
    catch (error) { console.error(error); throw error }
    finally { if (conn) { conn.release() } }
  }

  async qSetFirstLevel(studentId: number, levelId: number, userId: number) {
    let conn;
    try {
      conn = await connectionPool.getConnection()
      await conn.beginTransaction();
      const query = `
          INSERT INTO alphabetic_first (studentId, alphabeticFirstId, createdByUser, updatedByUser, createdAt, updatedAt)
          VALUES (?, ?, ?, ?, NOW(), NOW())
          ON DUPLICATE KEY UPDATE alphabeticFirstId = VALUES(alphabeticFirstId), updatedByUser = VALUES(updatedByUser), updatedAt = VALUES(updatedAt)
      `

      const [ queryResult ] = await conn.query(query, [studentId, levelId, userId, userId])
      await conn.commit()
      return queryResult as any
    }
    catch (error) { if(conn) await conn.rollback(); console.error(error); throw error }
    finally { if (conn) { conn.release() } }
  }
}

export const studentRepository = new StudentRepository()

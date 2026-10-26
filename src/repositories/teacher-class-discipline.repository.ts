import { qTeacherRelationShip, qUserTeacher, Training } from "../interfaces/interfaces";
import { OUT_CLASSROOMS } from "../utils/enums";
import { connectionPool } from "../services/db";

class TeacherClassDisciplineRepository {

  async qEndAllTeacherRelations(teacherId: number) {
    let conn;
    try {
      conn = await connectionPool.getConnection();
      await conn.beginTransaction();

      const updateQuery = `UPDATE teacher_class_discipline SET endedAt = NOW() where teacherId = ?;`

      const [ queryResult ] = await conn.query(updateQuery, [teacherId])

      await conn.commit()

      return queryResult
    }
    catch (error) { if(conn) await conn.rollback(); console.error(error); throw error }
    finally { if (conn) { conn.release() } }
  }

  async qSingleRel(teacherId: number, classroomId: number, disciplineId: number) {
    let conn;
    try {
      conn = await connectionPool.getConnection()
      await conn.beginTransaction();

      const insertQuery = `INSERT INTO teacher_class_discipline (startedAt, teacherId, classroomId, disciplineId) VALUES (NOW(), ?, ?, ?)`
      const [ queryResult ] = await conn.query(insertQuery, [teacherId, classroomId, disciplineId])

      await conn.commit()

      return queryResult
    }
    catch (error) { if(conn) await conn.rollback(); console.error(error); throw error }
    finally { if (conn) { conn.release() } }
  }

  async qTeacherRelationship(teacherId: number | string) {
    let conn;
    try {
      conn = await connectionPool.getConnection()
      const qTeacher =

        `
        SELECT 
          person.id AS person_id, person.name AS person_name, person.birth AS person_birth,
          person_category.id AS category_id, person_category.name AS category_name,
          teacher.id AS teacher_id, teacher.register AS teacher_register, teacher.email AS teacher_email, teacher.schoolId AS school_id, teacher.observation
        FROM person
          INNER JOIN teacher ON person.id = teacher.personId
          INNER JOIN person_category ON person.categoryId = person_category.id
        WHERE teacher.id = ?
      `

      const [ teacherQueryResult ] = await conn.query(qTeacher, [teacherId])

      const qRelationships =
        `
        SELECT 
          tcd.id, tcd.teacherId, tcd.classroomId, tcd.disciplineId, tcd.contractId AS contract, tcd.startedAt,
          classroom.shortName AS classroomName, 
          school.shortName AS schoolName, 
          discipline.name AS disciplineName
        FROM teacher_class_discipline as tcd
          INNER JOIN classroom ON tcd.classroomId = classroom.id
          INNER JOIN school ON classroom.schoolId = school.id
          INNER JOIN discipline ON tcd.disciplineId = discipline.id
        WHERE tcd.teacherId = ? AND tcd.endedAt IS NULL
        ORDER BY classroom.shortName, school.shortName, discipline.name
      `

      const [ teacherClassesDisciplines ] = (await conn.query(qRelationships, [teacherId]))

      let relationships = teacherClassesDisciplines as Array<qTeacherRelationShip>

      let teacher = (teacherQueryResult as Array<any>)[0]

      return {
        id: teacher.teacher_id,
        email: teacher.teacher_email,
        register: teacher.teacher_register,
        school: teacher.school_id,
        observation: teacher.observation,
        person: {
          id: teacher.person_id,
          name: teacher.person_name,
          birth: teacher.person_birth,
          category: {
            id: teacher.category_id,
            name: teacher.category_name
          }
        },
        teacherClassesDisciplines: relationships.map(el => ({ ...el, active: true }))
      }
    }
    catch (error) { console.error(error); throw error }
    finally { if (conn) { conn.release() } }
  }

  async updateTeacherContractCurrentYear(body: { teacherId: number, schoolId: number, contractId: number, categoryId: number, yearId: number, yearName: string, classroom: number }) {
    let conn;
    try {
      conn = await connectionPool.getConnection()
      await conn.beginTransaction()
      const query =
        `
          UPDATE teacher_class_discipline AS tcd
              INNER JOIN classroom AS c ON tcd.classroomId = c.id
              INNER JOIN school AS s ON c.schoolId = s.id
          SET tcd.contractId = ?
          WHERE
              tcd.teacherId = ? AND
              s.id = ? AND
              CAST(LEFT(c.shortName, 1) AS UNSIGNED) = ? AND
              c.categoryId = ? AND
              tcd.endedAt IS NULL
      `

      const [ queryResult ] = await conn.query(query, [body.contractId, body.teacherId, body.schoolId, body.classroom, body.categoryId])
      await conn.commit()
      return queryResult
    }
    catch (error) { if(conn) await conn.rollback(); console.error(error); throw error }
    finally { if (conn) { conn.release() } }
  }

  async updateTeacherContractOtherYear(body: { teacherId: number, schoolId: number, contractId: number, categoryId: number, yearId: number, yearName: string, classroom: number }) {
    let conn;
    try {
      conn = await connectionPool.getConnection()
      await conn.beginTransaction()
      const query = `
    UPDATE teacher_class_discipline AS tcd
    INNER JOIN classroom AS c ON tcd.classroomId = c.id
    INNER JOIN school AS s ON c.schoolId = s.id
    INNER JOIN training_teacher AS tt ON tt.teacherId = tcd.teacherId
    INNER JOIN training AS tr ON tt.trainingId = tr.id
    INNER JOIN year AS y ON tr.yearId = y.id
    SET tcd.contractId = ?
    WHERE
      tcd.teacherId = ? AND
      s.id = ? AND
      CAST(LEFT(c.shortName, 1) AS UNSIGNED) = ? AND
      c.categoryId = ? AND
      y.name = ?
  `
      const [ queryResult ] = await conn.query(query, [
        body.contractId,
        body.teacherId,
        body.schoolId,
        body.classroom,
        body.categoryId,
        body.yearName
      ])
      await conn.commit()
      return queryResult
    }
    catch (error) { if(conn) await conn.rollback(); console.error(error); throw error }
    finally { if (conn) { conn.release() } }
  }

  async qSpecificDisciplinesInPEBI(referencedTraining: Training, isCurrentYear: boolean, referencedTrainingYear: string, teacher: qUserTeacher) {
    let conn;
    try {
      conn = await connectionPool.getConnection()
      const shouldFilterBySchool = teacher.school?.id !== null && ![1, 2, 10].includes(teacher.person.category.id);
      const shouldFilterByDiscipline = referencedTraining.disciplineId !== null && referencedTraining.disciplineId !== undefined;
      const shouldFilterByTeacher = [7, 8].includes(teacher.person.category.id);

      const query = `
        SELECT
            t.id,
            p.name,
            d.name AS discipline,
            GROUP_CONCAT(DISTINCT CAST(LEFT(c.shortName, 1) AS UNSIGNED) ORDER BY CAST(LEFT(c.shortName, 1) AS UNSIGNED) SEPARATOR ', ') AS classroom,
            s.id AS schoolId,
            s.shortName,
            d.id AS disciplineId,
            CASE WHEN s.id = t.schoolId THEN 1 ELSE 0 END AS isHeadquarterSchool
        FROM teacher_class_discipline AS tcd
                 INNER JOIN discipline AS d ON tcd.disciplineId = d.id
                 INNER JOIN teacher AS t ON tcd.teacherId = t.id
                 INNER JOIN person AS p ON t.personId = p.id
                 INNER JOIN person_category AS pc ON p.categoryId = pc.id
                 INNER JOIN classroom AS c ON tcd.classroomId = c.id
                 INNER JOIN classroom_category AS cc ON c.categoryId = cc.id
                 INNER JOIN school AS s ON c.schoolId = s.id
            ${!isCurrentYear ? `
 INNER JOIN training_teacher AS tt ON tt.teacherId = t.id
 INNER JOIN training AS tr ON tt.trainingId = tr.id
 INNER JOIN year AS y ON tr.yearId = y.id
 ` : ''}
        WHERE
            ${ shouldFilterByTeacher ? 'tcd.teacherId = ? AND' : '' }
            pc.id = 8 AND
            ${ isCurrentYear ? 'tcd.endedAt IS NULL' : 'y.name = ?' } AND
            ${ shouldFilterBySchool ? 'c.schoolId = ? AND' : '' }
        -- Disciplinas específicas (Inglês=6, Ed. Física=7, Artes=8) em turmas PEBI (1º ao 5º ano)
            d.id IN (6, 7, 8) AND
            CAST(LEFT(c.shortName, 1) AS UNSIGNED) BETWEEN 1 AND 5
            ${ shouldFilterByDiscipline ? 'AND tcd.disciplineId = ?' : '' }
        GROUP BY t.id, p.id, p.name, s.id, s.shortName, d.id, d.name, CASE WHEN s.id = t.schoolId THEN 1 ELSE 0 END
        ORDER BY
            CASE WHEN s.id = t.schoolId THEN 0 ELSE 1 END,  -- Escola sede primeiro
            s.shortName,
            p.name
    `;

      const queryParams = [
        ...(shouldFilterByTeacher ? [teacher.id] : []),
        ...(isCurrentYear ? [] : [referencedTrainingYear]),
        ...(shouldFilterBySchool ? [teacher.school.id] : []),
        ...(shouldFilterByDiscipline ? [referencedTraining.disciplineId] : [])
      ];

      const [queryResult] = await conn.query(query, queryParams);

      return queryResult as Array<{ id: number, name: string, discipline: string, classroom: string, schoolId: number, shortName: string, disciplineId: number, isHeadquarterSchool: number }>;
    }
    catch (error) { console.error(error); throw error }
    finally { if (conn) { conn.release() } }
  }

  async qTeachersByCategory(referencedTraining: Training, isCurrentYear: boolean, referencedTrainingYear: string, teacher: qUserTeacher) {
    let conn;
    try {
      conn = await connectionPool.getConnection()
      const shouldFilterBySchool = teacher.school?.id !== null && ![1, 2, 10].includes(teacher.person.category.id);
      const shouldFilterByClassroom = (referencedTraining.categoryId === 1 || referencedTraining.categoryId === 3) && referencedTraining.classroom !== null && referencedTraining.classroom !== undefined;
      const shouldFilterByDiscipline = referencedTraining.categoryId === 2 && referencedTraining.disciplineId !== null && referencedTraining.disciplineId !== undefined;
      const shouldFilterByTeacher = [7, 8].includes(teacher.person.category.id);

      const mainQuery = `
        SELECT
            t.id,
            p.name,
            CASE WHEN cc.id IN (1, 3) THEN 'POLIVALENTE' ELSE d.name END AS discipline,
            ${referencedTraining.categoryId === 2 ?
        `GROUP_CONCAT(DISTINCT CAST(LEFT(c.shortName, 1) AS UNSIGNED) ORDER BY CAST(LEFT(c.shortName, 1) AS UNSIGNED) SEPARATOR ', ') AS classroom` :
        `CAST(LEFT(MIN(c.shortName), 1) AS UNSIGNED) AS classroom`
      },
            s.id AS schoolId,
            s.shortName,
            ${referencedTraining.categoryId === 2 ? 'd.id AS disciplineId' : 'NULL AS disciplineId'},
            CASE WHEN s.id = t.schoolId THEN 1 ELSE 0 END AS isHeadquarterSchool
        FROM teacher_class_discipline AS tcd
                 INNER JOIN discipline AS d ON tcd.disciplineId = d.id
                 INNER JOIN teacher AS t ON tcd.teacherId = t.id
                 INNER JOIN person AS p ON t.personId = p.id
                 INNER JOIN person_category AS pc ON p.categoryId = pc.id
                 INNER JOIN classroom AS c ON tcd.classroomId = c.id
                 INNER JOIN classroom_category AS cc ON c.categoryId = cc.id
                 INNER JOIN school AS s ON c.schoolId = s.id
            ${!isCurrentYear ? `
 INNER JOIN training_teacher AS tt ON tt.teacherId = t.id
 INNER JOIN training AS tr ON tt.trainingId = tr.id
 INNER JOIN year AS y ON tr.yearId = y.id
 ` : ''}
        WHERE
            ${ shouldFilterByTeacher ? 'tcd.teacherId = ? AND' : '' }
            cc.id = ? AND
            pc.id = 8 AND
            ${ isCurrentYear ? 'tcd.endedAt IS NULL' : 'y.name = ?' } AND
            ${ shouldFilterByClassroom ? 'CAST(LEFT(c.shortName, 1) AS UNSIGNED) = ? AND' : '' }
            ${ shouldFilterBySchool ? 'c.schoolId = ? AND' : '' }
            (
            (cc.id IN (1, 3) AND d.id NOT IN (6, 7, 8, 9)) OR
            (cc.id = 2 AND ${ shouldFilterByDiscipline ? 'tcd.disciplineId = ?' : 'tcd.disciplineId = COALESCE(?, tcd.disciplineId)' })
            )
        GROUP BY
            ${referencedTraining.categoryId === 2 ?
        `t.id, p.id, p.name, s.id, s.shortName, d.id, CASE WHEN cc.id IN (1, 3) THEN 'POLIVALENTE' ELSE d.name END, CASE WHEN s.id = t.schoolId THEN 1 ELSE 0 END` :
        `t.id, p.id, p.name, s.id, s.shortName, CAST(LEFT(c.shortName, 1) AS UNSIGNED), CASE WHEN cc.id IN (1, 3) THEN 'POLIVALENTE' ELSE d.name END, CASE WHEN s.id = t.schoolId THEN 1 ELSE 0 END`
      }
        ORDER BY s.shortName
    `;

      const mainQueryParams = [
        ...(shouldFilterByTeacher ? [teacher.id] : []),
        referencedTraining.categoryId,
        ...(isCurrentYear ? [] : [referencedTrainingYear]),
        ...(shouldFilterByClassroom ? [referencedTraining.classroom] : []),
        ...(shouldFilterBySchool ? [teacher.school.id] : []),
        referencedTraining.disciplineId
      ];

      const [mainResult] = await conn.query(mainQuery, mainQueryParams);
      let allTeachers = mainResult as Array<{ id: number, name: string, discipline: string, classroom: number | string, schoolId: number, shortName: string, disciplineId?: number | null, isHeadquarterSchool: number }>;

      if (referencedTraining.categoryId === 2) {
        const specificTeachers = await this.qSpecificDisciplinesInPEBI(referencedTraining, isCurrentYear, referencedTrainingYear, teacher);

        const existingIds = new Set(allTeachers.map(t => `${t.id}-${t.schoolId}-${t.disciplineId}`));
        const newTeachers = specificTeachers.filter(t =>
          !existingIds.has(`${t.id}-${t.schoolId}-${t.disciplineId}`)
        );

        allTeachers = [...allTeachers, ...newTeachers];

        allTeachers.sort((a, b) => a.shortName.localeCompare(b.shortName));
      }

      return allTeachers;
    }
    catch (error) { console.error(error); throw error }
    finally { if (conn) { conn.release() } }
  }

  async qAllTClass(masterUser: boolean, teacherId: number) {
    let conn;
    try {
      conn = await connectionPool.getConnection();

      let query: string;
      const params: any[] = [];

      if (masterUser) {
        // Query para Super Usuários: Busca todas as salas
        query = `
        SELECT 
          c.id AS id, 
          c.shortName AS name, 
          s.shortName AS school
        FROM classroom AS c
        LEFT JOIN school AS s ON c.schoolId = s.id
        GROUP BY c.id
      `;
      } else {
        // Query para Professores: Busca apenas as salas onde ele leciona (sem vínculos encerrados)
        query = `
        SELECT 
          c.id AS id, 
          c.shortName AS name, 
          s.shortName AS school
        FROM teacher_class_discipline AS tcd
        LEFT JOIN classroom AS c ON tcd.classroomId = c.id
        LEFT JOIN school AS s ON c.schoolId = s.id
        WHERE tcd.teacherId = ? AND tcd.endedAt IS NULL
        GROUP BY c.id
      `;
        params.push(teacherId);
      }

      const [ queryResult ] = await conn.query(query, params);

      return queryResult as Array<{ id: number, name: string, school: string }>;
    }
    catch (error) { console.error(error); throw error }
    finally { if (conn) { conn.release() } }
  }

  async qAllTClassTx(masterUser: boolean, teacherId: number) {
    let conn;
    try {
      conn = await connectionPool.getConnection();

      let query: string;
      const params: any[] = [];

      if (masterUser) {
        query = `
      SELECT 
        c.id AS id, 
        c.shortName AS name, 
        s.shortName AS school
      FROM classroom AS c
      LEFT JOIN school AS s ON c.schoolId = s.id
      GROUP BY c.id
    `;
      } else {
        // Usamos o placeholder (?) para a proteção do driver mysql2
        query = `
      SELECT 
        c.id AS id, 
        c.shortName AS name, 
        s.shortName AS school
      FROM teacher_class_discipline AS tcd
      LEFT JOIN classroom AS c ON tcd.classroomId = c.id
      LEFT JOIN school AS s ON c.schoolId = s.id
      WHERE tcd.teacherId = ? AND tcd.endedAt IS NULL
      GROUP BY c.id

      UNION

      SELECT 
        c.id AS id, 
        c.shortName AS name, 
        s.shortName AS school
      FROM classroom AS c
      LEFT JOIN school AS s ON c.schoolId = s.id
      WHERE c.id IN (?)
    `;

        // Passamos o teacherId para a primeira interrogação, e o Array para a segunda!
        params.push(teacherId, OUT_CLASSROOMS);
      }

      const [ queryResult ] = await conn.query(query, params);

      return queryResult as Array<{ id: number, name: string, school: string }>;
    }
    catch (error) { console.error(error); throw error }
    finally { if (conn) { conn.release() } }
  }
}

export const teacherClassDisciplineRepository = new TeacherClassDisciplineRepository()

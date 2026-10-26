import { qTeacherClassrooms, qTeacherDisciplines, qUser, TeacherBody } from "../interfaces/interfaces";
import { Teacher } from "../model/Teacher";
import { PER_CAT } from "../utils/enums";
import { connectionPool } from "../services/db";
import { toSqlUtcDateTime } from "../utils/sqlDateTime";
import { UserFormatter } from "../utils/formatters/user.formatter";

class TeacherRepository {

  async qTeacherDisciplines(userId: number) {
    let conn;
    try {
      conn = await connectionPool.getConnection()
      const query =

        `
        SELECT t.id, GROUP_CONCAT(DISTINCT d.id ORDER BY d.id ASC) AS disciplines
        FROM teacher AS t
          INNER JOIN person AS p ON t.personId = p.id
          INNER JOIN user AS u ON p.id = u.personId
          INNER JOIN teacher_class_discipline AS tcd ON t.id = tcd.teacherId
          INNER JOIN discipline AS d ON tcd.disciplineId = d.id
        WHERE u.id = ? AND tcd.endedAt IS NULL
        GROUP BY t.id
      `

      const [ queryResult ] = await conn.query(query, [userId])

      const qTeacherDisciplines = (queryResult as qTeacherDisciplines[])[0]

      return { id: qTeacherDisciplines?.id, disciplines: qTeacherDisciplines?.disciplines?.split(',').map(el => Number(el)) ?? [] }
    }
    catch (error) { console.error(error); throw error }
    finally { if (conn) { conn.release() } }
  }

  async qTeacherClassrooms(userId: number) {
    let conn;
    try {
      conn = await connectionPool.getConnection()
      const query =

        `
        SELECT t.id, GROUP_CONCAT(DISTINCT c.id ORDER BY c.id ASC) AS classrooms, pc.id AS categoryId
        FROM teacher AS t
          INNER JOIN person AS p ON t.personId = p.id
          INNER JOIN user AS u ON p.id = u.personId
          INNER JOIN teacher_class_discipline AS tcd ON t.id = tcd.teacherId
          INNER JOIN classroom AS c ON tcd.classroomId = c.id
          INNER JOIN person_category AS pc ON p.categoryId = pc.id
        WHERE u.id = ? AND tcd.endedAt IS NULL
        GROUP BY t.id
      `

      const [ queryResult ] = await conn.query(query, [userId])

      const qTeacherClassrooms = (queryResult as qTeacherClassrooms[])[0]

      return { id: qTeacherClassrooms?.id, personCategoryId: qTeacherClassrooms?.categoryId, classrooms: qTeacherClassrooms?.classrooms?.split(',').map(el => Number(el)) ?? [] }
    }
    catch (error) { console.error(error); throw error }
    finally { if (conn) { conn.release() } }
  }

  // Índices esperados: teacher(register), teacher(email) [ambas sem índice dedicado hoje — full scan
  // em tabela pequena], person_category(id) [PK], classroom(schoolId) [existe]
  async qCreateTeacher(body: TeacherBody, createdByUserId: number, username: string, userEmail: string, hashedPassword: string) {
    let conn;
    try {
      conn = await connectionPool.getConnection();
      await conn.beginTransaction();

      const [ registerRows ] = await conn.query(`SELECT id FROM teacher WHERE register = ? LIMIT 1`, [body.register]);
      if ((registerRows as any[])[0]) { await conn.commit(); return { outcome: 'register_exists' as const } }

      const email = body.email.toLowerCase().trim();
      const [ emailRows ] = await conn.query(`SELECT id FROM teacher WHERE email = ? LIMIT 1`, [email]);
      if ((emailRows as any[])[0]) { await conn.commit(); return { outcome: 'email_exists' as const } }

      const [ categoryRows ] = await conn.query(`SELECT id, name, active FROM person_category WHERE id = ? LIMIT 1`, [body.category.id]);
      const category = (categoryRows as any[])[0];

      const personName = body.name.toUpperCase().trim();
      const [ personResult ]: any = await conn.query(
        `INSERT INTO person (name, birth, categoryId) VALUES (?, ?, ?)`,
        [personName, toSqlUtcDateTime(body.birth), category.id]
      );
      const personId = personResult.insertId;

      const schoolId = Number(body.school) ? Number(body.school) : null;
      const createdAt = new Date();

      const [ teacherResult ]: any = await conn.query(
        `INSERT INTO teacher (email, register, observation, schoolId, createdByUser, createdAt, personId) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [body.email, body.register, body.observation, schoolId, createdByUserId, toSqlUtcDateTime(createdAt), personId]
      );
      const teacherId = teacherResult.insertId;

      await conn.query(
        `INSERT INTO user (username, email, password, personId) VALUES (?, ?, ?, ?)`,
        [username, userEmail, hashedPassword, personId]
      );

      const MASTER_FANOUT_ROLES = [PER_CAT.DIRE, PER_CAT.VICE, PER_CAT.COOR, PER_CAT.SECR, PER_CAT.MONI];
      const relationValues: any[] = [];

      if (MASTER_FANOUT_ROLES.includes(body.category.id)) {
        const [ disciplineRows ] = await conn.query(`SELECT id FROM discipline`);
        const [ classroomRows ] = await conn.query(`SELECT id FROM classroom WHERE schoolId = ?`, [Number(body.school)]);

        for (const discipline of disciplineRows as any[]) {
          for (const classroom of classroomRows as any[]) {
            relationValues.push([teacherId, classroom.id, discipline.id, toSqlUtcDateTime(new Date()), null]);
          }
        }
      }
      else if (body.category.id === PER_CAT.PROF) {
        for (const rel of body.teacherClassesDisciplines) {
          const contractId = (rel.contract === 1 || rel.contract === 2) ? rel.contract : null;
          relationValues.push([teacherId, rel.classroomId, rel.disciplineId, toSqlUtcDateTime(new Date()), contractId]);
        }
      }

      if (relationValues.length > 0) {
        await conn.query(
          `INSERT INTO teacher_class_discipline (teacherId, classroomId, disciplineId, startedAt, contractId) VALUES ?`,
          [relationValues]
        );
      }

      await conn.commit();

      return {
        outcome: 'created' as const,
        data: {
          id: teacherId,
          createdByUser: createdByUserId,
          createdAt,
          person: { id: personId, name: personName, birth: body.birth, category },
          email: body.email,
          register: body.register,
          observation: body.observation,
          ...(schoolId ? { school: { id: schoolId } } : {})
        }
      };
    }
    catch (error) { if (conn) await conn.rollback(); console.error(error); throw error }
    finally { if (conn) { conn.release() } }
  }

  async qTeacherByUser(userId: number) {
    let conn;
    try {
      conn = await connectionPool.getConnection();
      const query =
        `
        SELECT teacher.id, teacher.email, teacher.register, teacher.schoolId,
               p.id AS person_id, p.name AS person_name,
               pc.id AS person_category_id, pc.name AS person_category_name,
               u.id AS user_id, u.username AS user_name, u.email AS user_email
        FROM teacher
          INNER JOIN person AS p ON teacher.personId = p.id
          INNER JOIN person_category AS pc ON p.categoryId = pc.id
          INNER JOIN user AS u ON p.id = u.personId
        WHERE u.id = ?
      `

      const [ queryResult ] = await conn.query(query, [userId])
      const data = (queryResult as any[])[0]

      return UserFormatter.userTeacher(data)
    }
    catch (error) { console.error(error); throw error }
    finally { if (conn) { conn.release() } }
  }

  async qAllTeachersForSuperUser(search: string, adminSearch: boolean = false) {
    let conn;
    try {

      conn = await connectionPool.getConnection();
      const personSearch = `%${search}%`;

      const existsCondition = adminSearch
        ? 't.id <> 1 AND'
        : `EXISTS (
            SELECT 1
            FROM teacher_class_discipline AS tcd
            WHERE tcd.teacherId = t.id
        ) AND `;

      const query = `
          SELECT t.id, t.email, t.register,
                 p.id AS pId, p.name, p.birth,
                 pc.id AS pcId, pc.name AS catName, pc.active
          FROM teacher AS t
                   LEFT JOIN person AS p ON t.personId = p.id
                   LEFT JOIN person_category AS pc ON p.categoryId = pc.id
          WHERE ${existsCondition}
              p.name COLLATE utf8mb4_unicode_ci LIKE ?
          ORDER BY p.name;
      `;

      const [ queryResult ] = await conn.query(query, [personSearch]);

      return UserFormatter.superUsers(queryResult as { [key: string]: any }[]);
    }
    catch (error) { console.error(error); throw error }
    finally { if (conn) { conn.release() } }
  }

  async qTeacherThatBelongs(classroomsIds: number[], search: string) {
    if (!classroomsIds || classroomsIds.length === 0) { return [] }
    let conn;
    try {
      conn = await connectionPool.getConnection();

      // Deixa a string do jeito que veio
      const personSearch = `%${search}%`;

      const query = `
          SELECT t.id, t.email, t.register,
                 p.id AS pId, p.name, p.birth,
                 pc.id AS pcId, pc.name AS catName, pc.active
          FROM teacher AS t
                   LEFT JOIN person AS p ON t.personId = p.id
                   LEFT JOIN person_category AS pc ON p.categoryId = pc.id
          WHERE EXISTS (
              SELECT 1
              FROM teacher_class_discipline AS tcd
              WHERE tcd.teacherId = t.id
                AND tcd.classroomId IN (?)
                AND tcd.endedAt IS NULL
          )
            AND p.name COLLATE utf8mb4_unicode_ci LIKE ?
          ORDER BY p.name
      `;

      const [queryResult] = await conn.query(query, [classroomsIds, personSearch]);

      return UserFormatter.teacher(queryResult as { [key: string]: any }[])
    }
    catch (error) { console.error(error); throw error }
    finally { if (conn) { conn.release() } }
  }

  async qTeacherThatNotBelongs(classroomsIds: number[], categoryId: number, search: string) {
    if (!classroomsIds || classroomsIds.length === 0) { return [] }
    let conn;
    try {
      conn = await connectionPool.getConnection();
      const personSearch = `%${search}%`;

      const query = `
      SELECT t.id, t.email, t.register,
             p.id AS pId, p.name, p.birth,
             pc.id AS pcId, pc.name AS catName, pc.active
      FROM teacher AS t
               LEFT JOIN person AS p ON t.personId = p.id
               LEFT JOIN person_category AS pc ON p.categoryId = pc.id
      WHERE NOT EXISTS (
          SELECT 1
          FROM teacher_class_discipline AS tcd
          WHERE tcd.teacherId = t.id
            AND tcd.classroomId IN (?)
            AND tcd.endedAt IS NULL
      )
        AND pc.id = ?
        AND p.name COLLATE utf8mb4_unicode_ci LIKE ?
      ORDER BY p.name
    `;

      const [queryResult] = await conn.query(query, [classroomsIds, categoryId, personSearch]);

      return UserFormatter.teacher(queryResult as { [key: string]: any }[])
    }
    catch (error) { console.error(error); throw error }
    finally { if (conn) { conn.release() } }
  }

  async qUser(userId: number) {
    let conn
    try {
      conn = await connectionPool.getConnection()
      const query =

        `
        SELECT pc.id as categoryId, u.id as userId, teacher.id as teacherId
        FROM teacher
          INNER JOIN person AS p ON teacher.personId = p.id
          INNER JOIN person_category AS pc ON p.categoryId = pc.id
          INNER JOIN user AS u ON p.id = u.personId
        WHERE u.id = ?
      `

      const [ queryResult ] = await conn.query(query, [userId])
      return (queryResult as qUser[])[0] as { categoryId: number, userId: number, teacherId: number }
    }
    catch (error) { console.error(error); throw error }
    finally { if (conn) { conn.release() } }
  }

  async qTeacher(teacherId: number) {
    let conn;
    try {
      conn = await connectionPool.getConnection();
      const query =

        `
        SELECT *
        FROM teacher AS t
        WHERE t.id = ?
      `

      const [ queryResult ] = await conn.query(query, [teacherId])

      return (queryResult as Teacher[])[0]
    }
    catch (error) { console.error(error); throw error }
    finally { if (conn) { conn.release() } }
  }
}

export const teacherRepository = new TeacherRepository()

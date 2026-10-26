import { TeacherParam, Training, TrainingResult } from "../interfaces/interfaces";
import { ResultSetHeader } from "mysql2/promise";
import { TrainingTeacherStatus } from "../model/TrainingTeacherStatus";
import { connectionPool } from "../services/db";
import { Helper } from "../utils/helpers";

class TrainingRepository {

  async qNewTraining(yearId: number, category: number, month: number, meeting: number, createdByUser: number, classroom?: number, discipline?: number, observation?: string) {
    let conn;
    try {
      conn = await connectionPool.getConnection();
      await conn.beginTransaction();
      const insertQuery = `
          INSERT INTO training (yearId, categoryId, monthReferenceId, meetingId, classroom, createdByUser, updatedByUser, disciplineId, observation)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE observation = VALUES(observation), updatedByUser = VALUES(updatedByUser)
      `;
      const [queryResult] = await conn.query<ResultSetHeader>(insertQuery, [yearId, category, month, meeting, classroom, createdByUser, createdByUser, discipline || null, observation || null])
      await conn.commit();
      return queryResult;
    }
    catch (error) { if(conn){ await conn.rollback() } console.error(error); throw error }
    finally { if (conn) { conn.release() } }
  }

  async qUpsertTrainingTeacher(teacherId: number, trainingId: number, statusId: number, userId: number) {
    let conn;
    try {
      conn = await connectionPool.getConnection()
      await conn.beginTransaction();
      const query = `
        INSERT INTO training_teacher (teacherId, trainingId, statusId, createdAt, createdByUser, updatedAt, updatedByUser)
        VALUES (?, ?, ?, NOW(), ?, NOW(), ?)
        ON DUPLICATE KEY UPDATE
                             statusId = VALUES(statusId),
                             updatedAt = NOW(),
                             updatedByUser = VALUES(updatedByUser)
    `;

      const [result] = await conn.query<ResultSetHeader>(query, [teacherId, trainingId, statusId, userId, userId]);

      await conn.commit()

      return result;
    }
    catch (error) { if(conn) await conn.rollback(); console.error(error); throw error }
    finally { if (conn) { conn.release() } }
  }

  async qUpsertTrainingTeacherObs(teacherId: number, trainingId: number, observation: string, userId: number) {
    let conn;
    try {
      conn = await connectionPool.getConnection()
      await conn.beginTransaction();
      const query = `
        INSERT INTO training_teacher (teacherId, trainingId, observation, createdAt, createdByUser, updatedAt, updatedByUser)
        VALUES (?, ?, ?, NOW(), ?, NOW(), ?)
        ON DUPLICATE KEY UPDATE
                             observation = VALUES(observation),
                             updatedAt = NOW(),
                             updatedByUser = VALUES(updatedByUser)
    `;

      const [result] = await conn.query<ResultSetHeader>(query, [teacherId, trainingId, observation, userId, userId]);
      await conn.commit();
      return result;
    }
    catch (error) { if(conn) await conn.rollback(); console.error(error); throw error }
    finally { if (conn) { conn.release() } }
  }

  async qUpdateTraining(id: number, meeting: number, category: number, month: number, updatedByUser: number, classroom?: number, discipline?: number, observation?: string) {
    let conn;
    try {
      conn = await connectionPool.getConnection()
      await conn.beginTransaction();
      const updateQuery = `
      UPDATE training 
      SET meetingId = ?, categoryId = ?, monthReferenceId = ?, classroom = ?, disciplineId = ?, observation = ?, updatedByUser = ?
      WHERE id = ?
    `;

      const [queryResult] = await conn.query<ResultSetHeader>(updateQuery, [meeting, category, month, classroom, discipline || null, observation || null, updatedByUser, id]);
      await conn.commit();
      return queryResult;
    }
    catch (error) { if(conn) await conn.rollback(); console.error(error); throw error }
    finally { if (conn) { conn.release() } }
  }

  async qPresence(trainingId: number) {
    let conn;
    try {
      conn = await connectionPool.getConnection()
      const query = `
        SELECT *
        FROM training AS t
        WHERE t.id = ?
    `;

      const [queryResult] = await conn.query(query, [trainingId]);
      return (queryResult as Array<Training>)[0]
    }
    catch (error) { console.error(error); throw error }
    finally { if (conn) { conn.release() } }
  }

  async qAllReferencedTrainings(referencedTraining: Training) {
    let conn;
    try {
      conn = await connectionPool.getConnection()
      let query = '';

      if (!referencedTraining.disciplineId && (referencedTraining.categoryId === 1 || referencedTraining.categoryId === 3)) {
        query = `
          SELECT
              t.id,
              t.classroom,
              cc.id AS categoryId,
              cc.name AS categoryName,
              y.id AS yearId,
              y.name AS yearName,
              tm.id AS meetingId,
              tm.name AS meetingName,
              tmr.id AS monthId,
              tmr.name AS monthName,
              d.id AS disciplineId,
              d.name AS disciplineName
          FROM training AS t
                   INNER JOIN training_schedules_meeting AS tm ON t.meetingId = tm.id
                   INNER JOIN training_schedules_months_references AS tmr ON t.monthReferenceId = tmr.id
                   INNER JOIN classroom_category AS cc ON t.categoryId = cc.id
                   INNER JOIN year AS y ON t.yearId = y.id
                   LEFT JOIN discipline AS d ON t.disciplineId = d.id
          WHERE
              t.yearId = ? AND
              t.categoryId = ? AND
              t.classroom = ?
          ORDER BY t.id
      `;

        const [queryResult] = await conn.query(query, [
          referencedTraining.yearId,
          referencedTraining.categoryId,
          referencedTraining.classroom
        ]);

        return Helper.trainingsWithSchedules(queryResult as any[]);
      }

      query = `
        SELECT
            t.id,
            cc.id AS categoryId,
            cc.name AS categoryName,
            y.id AS yearId,
            y.name AS yearName,
            tm.id AS meetingId,
            tm.name AS meetingName,
            tmr.id AS monthId,
            tmr.name AS monthName,
            d.id AS disciplineId,
            d.name AS disciplineName
        FROM training AS t
                 INNER JOIN training_schedules_meeting AS tm ON t.meetingId = tm.id
                 INNER JOIN training_schedules_months_references AS tmr ON t.monthReferenceId = tmr.id
                 INNER JOIN classroom_category AS cc ON t.categoryId = cc.id
                 INNER JOIN year AS y ON t.yearId = y.id
                 LEFT JOIN discipline AS d ON t.disciplineId = d.id
        WHERE
            t.yearId = ? AND
            t.categoryId = ? AND
            t.disciplineId = ?
        ORDER BY t.id
    `;

      const [queryResult] = await conn.query(query, [
        referencedTraining.yearId,
        referencedTraining.categoryId,
        referencedTraining.disciplineId
      ]);

      return Helper.trainingsWithSchedules(queryResult as any[]);
    }
    catch (error) { console.error(error); throw error }
    finally { if (conn) { conn.release() } }
  }

  async qTeacherTrainings(teachers: TeacherParam[], trainingIds: number[], categoryId: number, isCurrentYear: boolean, referencedTrainingYear: string ) {
    let conn;
    try {
      conn = await connectionPool.getConnection()
      const query = `
        SELECT tt.id, tt.teacherId, tt.trainingId, tt.statusId, tt.observation
        FROM training_teacher AS tt
        WHERE tt.trainingId IN (?) AND tt.teacherId = ?
    `

      // Query para PEBI (categoryId = 1) - comportamento original
      const contractQueryPEBI = `
        SELECT tcd.id, tcd.teacherId, tcd.contractId
        FROM teacher_class_discipline AS tcd
                 INNER JOIN classroom AS c ON tcd.classroomId = c.id
                 INNER JOIN school AS s ON c.schoolId = s.id
            ${!isCurrentYear ? `
INNER JOIN training_teacher AS tt ON tt.teacherId = tcd.teacherId
INNER JOIN training AS tr ON tt.trainingId = tr.id
INNER JOIN year AS y ON tr.yearId = y.id
` : ''}
        WHERE
            tcd.teacherId = ? AND
            s.id = ? AND
            CAST(LEFT(c.shortName, 1) AS UNSIGNED) = ? AND
            c.categoryId IN (1, 3) AND
            tcd.disciplineId = COALESCE(?, tcd.disciplineId) AND
            ${isCurrentYear
        ? 'tcd.endedAt IS NULL'
        : 'y.name = ?'
      }
        LIMIT 1
    `

      // Query para PEBII (categoryId = 2) - comportamento original
      const contractQueryPEBII = `
        SELECT tcd.id, tcd.teacherId, tcd.contractId
        FROM teacher_class_discipline AS tcd
                 INNER JOIN classroom AS c ON tcd.classroomId = c.id
                 INNER JOIN school AS s ON c.schoolId = s.id
            ${!isCurrentYear ? `
INNER JOIN training_teacher AS tt ON tt.teacherId = tcd.teacherId
INNER JOIN training AS tr ON tt.trainingId = tr.id
INNER JOIN year AS y ON tr.yearId = y.id
` : ''}
        WHERE
            tcd.teacherId = ? AND
            s.id = ? AND
            c.categoryId = 2 AND
            tcd.disciplineId = COALESCE(?, tcd.disciplineId) AND
            ${isCurrentYear
        ? 'tcd.endedAt IS NULL'
        : 'y.name = ?'
      }
        LIMIT 1
    `

      // Query para disciplinas específicas em PEBI (nova)
      const contractQuerySpecificInPEBI = `
        SELECT tcd.id, tcd.teacherId, tcd.contractId
        FROM teacher_class_discipline AS tcd
                 INNER JOIN classroom AS c ON tcd.classroomId = c.id
                 INNER JOIN school AS s ON c.schoolId = s.id
            ${!isCurrentYear ? `
INNER JOIN training_teacher AS tt ON tt.teacherId = tcd.teacherId
INNER JOIN training AS tr ON tt.trainingId = tr.id
INNER JOIN year AS y ON tr.yearId = y.id
` : ''}
        WHERE
            tcd.teacherId = ? AND
            s.id = ? AND
            c.categoryId IN (1, 3) AND
            tcd.disciplineId = ? AND
            ${isCurrentYear
        ? 'tcd.endedAt IS NULL'
        : 'y.name = ?'
      }
        LIMIT 1
    `

      // Busca contratos
      for(let teacher of teachers) {
        let queryParams: any[];
        let contractQuery: string;

        // Detecta se é um professor de disciplina específica lecionando em PEBI
        const isSpecificDisciplineInPEBI = teacher.disciplineId !== null &&
          teacher.disciplineId !== undefined &&
          [6, 7, 8].includes(teacher.disciplineId) &&
          typeof teacher.classroom === 'string' &&
          teacher.classroom.split(',').some(c => parseInt(c.trim()) >= 1 && parseInt(c.trim()) <= 5);

        if ([1,3].includes(categoryId)) {
          // PEBI - usa classroom específico
          const classroom = typeof teacher.classroom === 'string' ?
            parseInt(teacher.classroom.split(',')[0].trim()) :
            teacher.classroom;

          queryParams = [
            teacher.id,
            teacher.schoolId,
            classroom,
            teacher.disciplineId,
            ...(isCurrentYear ? [] : [referencedTrainingYear])
          ];
          contractQuery = contractQueryPEBI;

        } else if (isSpecificDisciplineInPEBI) {
          // Professor de disciplina específica que leciona em PEBI mas aparece em busca PEBII
          queryParams = [
            teacher.id,
            teacher.schoolId,
            teacher.disciplineId,
            ...(isCurrentYear ? [] : [referencedTrainingYear])
          ];
          contractQuery = contractQuerySpecificInPEBI;

        } else {
          // PEBII - comportamento original
          queryParams = [
            teacher.id,
            teacher.schoolId,
            teacher.disciplineId,
            ...(isCurrentYear ? [] : [referencedTrainingYear])
          ];
          contractQuery = contractQueryPEBII;
        }

        const [queryResult] = await conn.query(contractQuery, queryParams);
        const result = (queryResult as Array<{ id: number, teacherId: number, contractId: number | null }>)[0];

        teacher.contract = result ? result.contractId : null;
      }

      // Busca treinamentos dos professores
      for(let teacher of teachers) {
        const [queryResult] = await conn.query(query, [trainingIds, teacher.id]);
        teacher.trainingTeachers = queryResult as Array<{ id: number, teacherId: number, trainingId: number, statusId: number | string, observation: string | null }>;
      }

      return teachers;
    }
    catch (error) { console.error(error); throw error }
    finally { if (conn) { conn.release() } }
  }

  async qDeleteTrainingTeacher(trainingId: number) {
    let conn;
    try {
      conn = await connectionPool.getConnection();

      const query = `DELETE FROM training_teacher WHERE training_teacher.trainingId = ?`

      const [ queryResult ] = await conn.query(query, [trainingId])

      return queryResult
    }
    catch (error) { if (conn) await conn.rollback(); console.error('qDeleteTrainingTeacher', error); throw error }
    finally { if (conn) conn.release() }
  }

  async qTrainings(yearId: number, search: string, peb: number, limit: number, offset: number) {
    let conn;
    try {
      conn = await connectionPool.getConnection()
      const query =
        `
          SELECT
              t.id AS id,
              t.classroom AS classroom,
              t.observation AS observation,
              d.name AS discipline,
              cc.name AS category,
              tm.name AS meeting,
              tsc.name AS month,
              y.name AS year,
              p.name AS createdBy
          FROM training AS t
                   INNER JOIN training_schedules_meeting AS tm ON t.meetingId = tm.id
                   INNER JOIN classroom_category AS cc ON t.categoryId = cc.id
                   INNER JOIN year AS y ON t.yearId = y.id
                   INNER JOIN training_schedules_months_references AS tsc ON t.monthReferenceId = tsc.id
                   INNER JOIN user AS u ON t.createdByUser = u.id
                   INNER JOIN person AS p ON u.personId = p.id
                   LEFT JOIN discipline AS d ON t.disciplineId = d.id
          WHERE t.yearId = ? AND t.categoryId = ?
          GROUP BY t.id, tm.name, t.classroom, t.observation, d.name, cc.name, y.name, p.name
          LIMIT ?
          OFFSET ?
      `

      const [ queryResult ] = await conn.query(query, [yearId, peb, limit, offset])
      return Helper.formatTrainings(queryResult as Array<any>)
    }
    catch (error) { console.error(error); throw error }
    finally { if (conn) { conn.release() } }
  }

  async qOneTraining(id: number): Promise<TrainingResult | null> {
    let conn;
    try {
      conn = await connectionPool.getConnection()
      const query = `
        SELECT
            t.id AS id,
            tm.id AS meeting,
            t.classroom AS classroom,
            t.observation AS observation,
            d.id AS discipline,
            cc.id AS category,
            tsc.id AS month
        FROM training AS t
                 INNER JOIN training_schedules_meeting AS tm ON t.meetingId = tm.id
                 INNER JOIN classroom_category AS cc ON t.categoryId = cc.id
                 INNER JOIN training_schedules_months_references AS tsc ON t.monthReferenceId = tsc.id
                 INNER JOIN year AS y ON t.yearId = y.id
                 INNER JOIN user AS u ON t.createdByUser = u.id
                 INNER JOIN person AS p ON u.personId = p.id
                 LEFT JOIN discipline AS d ON t.disciplineId = d.id
        WHERE t.id = ?
    `;

      const [queryResult] = await conn.query(query, [id]);
      const rows = queryResult as any[];

      if (rows.length === 0) { return null }

      return Helper.oneTraining(rows as Array<any>)
    }
    catch (error) { console.error(error); throw error }
    finally { if (conn) { conn.release() } }
  }

  async qTeacherTrainingStatus() {
    let conn;
    try {
      conn = await connectionPool.getConnection();
      const query = `SELECT id, name FROM training_teacher_status WHERE active = 1`
      const [ queryResult ] = await conn.query(query)
      return  queryResult as Array<TrainingTeacherStatus>
    }
    catch (error) { console.error(error); throw error }
    finally { if (conn) { conn.release() } }
  }

  async qTrainingSchedulesMonthReference() {
    let conn;
    try {
      conn = await connectionPool.getConnection();
      const query = `SELECT id, name FROM training_schedules_months_references ORDER BY id`
      const [ queryResult ] = await conn.query(query)
      return  queryResult as Array<{ id: number, name: string }>
    }
    catch (error) { console.error(error); throw error }
    finally { if (conn) { conn.release() } }
  }

  async qTrainingSchedulesMeetings() {
    let conn;
    try {
      conn = await connectionPool.getConnection();
      const query = `SELECT id, name FROM training_schedules_meeting ORDER BY id`
      const [ queryResult ] = await conn.query(query)
      return  queryResult as Array<{ id: number, name: string }>
    }
    catch (error) { console.error(error); throw error }
    finally { if (conn) { conn.release() } }
  }
}

export const trainingRepository = new TrainingRepository()

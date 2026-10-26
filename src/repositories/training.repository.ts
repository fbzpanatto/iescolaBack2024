import { TeacherParam, Training, TrainingResult } from "../interfaces/interfaces";
import { ResultSetHeader, RowDataPacket } from "mysql2/promise";
import { TrainingTeacherStatus } from "../model/TrainingTeacherStatus";
import { connectionPool } from "../services/db";
import { TrainingFormatter } from "../utils/formatters/training.formatter";

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

        return TrainingFormatter.trainingsWithSchedules(queryResult as any[]);
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

      return TrainingFormatter.trainingsWithSchedules(queryResult as any[]);
    }
    catch (error) { console.error(error); throw error }
    finally { if (conn) { conn.release() } }
  }

  async qTeacherTrainings(teachers: TeacherParam[], trainingIds: number[], categoryId: number, isCurrentYear: boolean, referencedTrainingYear: string ) {
    if (teachers.length === 0) return teachers;

    let conn;
    try {
      conn = await connectionPool.getConnection()
      const db = conn;

      type ContractVariant = 'PEBI' | 'SPECIFIC' | 'PEBII';

      interface ContractRow extends RowDataPacket {
        id: number
        teacherId: number
        contractId: number | null
        disciplineId: number | null
        schoolId: number
        classroomNumber?: number | null
      }

      interface TrainingTeacherRow extends RowDataPacket {
        id: number
        teacherId: number
        trainingId: number
        statusId: number | string
        observation: string | null
      }

      const resolveVariant = (teacher: TeacherParam): ContractVariant => {
        if ([1, 3].includes(categoryId)) return 'PEBI';

        const isSpecificDisciplineInPEBI = teacher.disciplineId !== null &&
          teacher.disciplineId !== undefined &&
          [6, 7, 8].includes(teacher.disciplineId) &&
          typeof teacher.classroom === 'string' &&
          teacher.classroom.split(',').some(c => parseInt(c.trim()) >= 1 && parseInt(c.trim()) <= 5);

        return isSpecificDisciplineInPEBI ? 'SPECIFIC' : 'PEBII';
      }

      const resolvePebiClassroom = (teacher: TeacherParam): number | undefined => typeof teacher.classroom === 'string' ?
        parseInt(teacher.classroom.split(',')[0].trim()) :
        teacher.classroom;

      const buckets: Record<ContractVariant, TeacherParam[]> = { PEBI: [], SPECIFIC: [], PEBII: [] };
      const variantByTeacher = new Map<TeacherParam, ContractVariant>();

      const inactive: TeacherParam[] = [];

      for (const teacher of teachers) {
        if (teacher.active === false) { inactive.push(teacher); continue }
        const variant = resolveVariant(teacher);
        buckets[variant].push(teacher);
        variantByTeacher.set(teacher, variant);
      }

      const fetchContractRows = async (variant: ContractVariant, bucket: TeacherParam[]): Promise<Map<number, ContractRow[]>> => {
        const rowsByTeacher = new Map<number, ContractRow[]>();
        if (bucket.length === 0) return rowsByTeacher;

        const teacherIds = [...new Set(bucket.map(t => t.id))];
        const schoolIds = [...new Set(bucket.map(t => t.schoolId))];

        const categoryFilter = variant === 'PEBII' ? 'c.categoryId = 2' : 'c.categoryId IN (1, 3)';
        const classroomSelect = variant === 'PEBI' ? ', CAST(LEFT(c.shortName, 1) AS UNSIGNED) AS classroomNumber' : '';

        const contractQuery = `
          SELECT DISTINCT tcd.id, tcd.teacherId, tcd.contractId, tcd.disciplineId, s.id AS schoolId${classroomSelect}
          FROM teacher_class_discipline AS tcd
                   INNER JOIN classroom AS c ON tcd.classroomId = c.id
                   INNER JOIN school AS s ON c.schoolId = s.id
              ${!isCurrentYear ? `
INNER JOIN training_teacher AS tt ON tt.teacherId = tcd.teacherId
INNER JOIN training AS tr ON tt.trainingId = tr.id
INNER JOIN year AS y ON tr.yearId = y.id
` : ''}
          WHERE
              tcd.teacherId IN (?) AND
              s.id IN (?) AND
              ${categoryFilter} AND
              ${isCurrentYear
          ? 'tcd.endedAt IS NULL'
          : 'y.name = ?'
        }
          ORDER BY tcd.id ASC
        `

        const [queryResult] = await db.query<ContractRow[]>(contractQuery, [
          teacherIds,
          schoolIds,
          ...(isCurrentYear ? [] : [referencedTrainingYear])
        ]);

        for (const row of queryResult) {
          const teacherRows = rowsByTeacher.get(row.teacherId);
          if (teacherRows) { teacherRows.push(row); continue }
          rowsByTeacher.set(row.teacherId, [row]);
        }

        return rowsByTeacher;
      }

      const rowsByVariant: Record<ContractVariant, Map<number, ContractRow[]>> = {
        PEBI: await fetchContractRows('PEBI', buckets.PEBI),
        SPECIFIC: await fetchContractRows('SPECIFIC', buckets.SPECIFIC),
        PEBII: await fetchContractRows('PEBII', buckets.PEBII)
      };

      const matchesCoalescedDiscipline = (row: ContractRow, teacher: TeacherParam): boolean =>
        row.disciplineId !== null &&
        (teacher.disciplineId === null || teacher.disciplineId === undefined || Number(row.disciplineId) === Number(teacher.disciplineId));

      const findContractRow = (teacher: TeacherParam, variant: ContractVariant): ContractRow | undefined => {
        const candidates = rowsByVariant[variant].get(teacher.id) ?? [];

        return candidates.find(row => {
          if (Number(row.schoolId) !== Number(teacher.schoolId)) return false;
          if (variant === 'PEBI') {
            return Number(row.classroomNumber) === resolvePebiClassroom(teacher) && matchesCoalescedDiscipline(row, teacher);
          }
          if (variant === 'SPECIFIC') {
            return row.disciplineId !== null && Number(row.disciplineId) === Number(teacher.disciplineId);
          }
          return matchesCoalescedDiscipline(row, teacher);
        });
      }

      const inactiveRowsByTeacher = new Map<number, ContractRow[]>();

      if (inactive.length > 0) {
        const inactiveQuery = `
          SELECT tcd.id, tcd.teacherId, tcd.contractId, s.id AS schoolId, CAST(LEFT(c.shortName, 1) AS UNSIGNED) AS classroomNumber
          FROM teacher_class_discipline AS tcd
                   INNER JOIN classroom AS c ON tcd.classroomId = c.id
                   INNER JOIN school AS s ON c.schoolId = s.id
          WHERE
              tcd.teacherId IN (?) AND
              s.id IN (?) AND
              c.categoryId IN (1, 3) AND
              tcd.disciplineId NOT IN (6, 7, 8, 9)
          ORDER BY tcd.id DESC
        `

        const [inactiveResult] = await db.query<ContractRow[]>(inactiveQuery, [
          [...new Set(inactive.map(t => t.id))],
          [...new Set(inactive.map(t => t.schoolId))]
        ]);

        for (const row of inactiveResult) {
          const teacherRows = inactiveRowsByTeacher.get(row.teacherId);
          if (teacherRows) { teacherRows.push(row); continue }
          inactiveRowsByTeacher.set(row.teacherId, [row]);
        }
      }

      const findInactiveContractRow = (teacher: TeacherParam): ContractRow | undefined =>
        (inactiveRowsByTeacher.get(teacher.id) ?? []).find(row =>
          Number(row.schoolId) === Number(teacher.schoolId) &&
          Number(row.classroomNumber) === resolvePebiClassroom(teacher)
        );

      for (const teacher of teachers) {
        const row = teacher.active === false ?
          findInactiveContractRow(teacher) :
          findContractRow(teacher, variantByTeacher.get(teacher) as ContractVariant);
        teacher.contract = row?.contractId ?? null;
      }

      if (trainingIds.length === 0) {
        for (const teacher of teachers) { teacher.trainingTeachers = [] }
        return teachers;
      }

      const trainingTeacherQuery = `
        SELECT tt.id, tt.teacherId, tt.trainingId, tt.statusId, tt.observation
        FROM training_teacher AS tt
        WHERE tt.teacherId IN (?) AND tt.trainingId IN (?)
        ORDER BY tt.id ASC
      `

      const [trainingTeacherRows] = await db.query<TrainingTeacherRow[]>(trainingTeacherQuery, [
        [...new Set(teachers.map(t => t.id))],
        trainingIds
      ]);

      const trainingTeachersByTeacher = new Map<number, TrainingTeacherRow[]>();

      for (const row of trainingTeacherRows) {
        const teacherRows = trainingTeachersByTeacher.get(row.teacherId);
        if (teacherRows) { teacherRows.push(row); continue }
        trainingTeachersByTeacher.set(row.teacherId, [row]);
      }

      for (const teacher of teachers) {
        teacher.trainingTeachers = trainingTeachersByTeacher.get(teacher.id) ?? [];
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
      return TrainingFormatter.formatTrainings(queryResult as Array<any>)
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

      return TrainingFormatter.oneTraining(rows as Array<any>)
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

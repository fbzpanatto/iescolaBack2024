import { qPendingTransfers, qTransferStatus, qUserTeacher } from "../interfaces/interfaces";
import { Transfer } from "../model/Transfer";
import { PER_CAT, TRANSFER_STATUS } from "../utils/enums";
import { connectionPool } from "../services/db";
import { transferEmail } from "../services/email";
import { toSqlUtcDateTime } from "../utils/sqlDateTime";
import { yearRepository } from "./year.repository";
import { catalogRepository } from "./catalog.repository";

class TransferRepository {

  // Índices esperados: student_classroom(classroomId) [existe], student_classroom(studentId) [existe], transfer(studentId) [existe]
  async qPendingTransferCountByClassrooms(classroomIds: number[], statusId: number) {
    if (classroomIds.length === 0) { return 0 }
    let conn;
    try {
      conn = await connectionPool.getConnection();
      const query = `
        SELECT COUNT(*) AS total
        FROM student_classroom AS sc
        INNER JOIN student AS stu ON stu.id = sc.studentId
        INNER JOIN transfer AS t ON t.studentId = stu.id
        WHERE sc.classroomId IN (?) AND sc.endedAt IS NULL AND t.endedAt IS NULL AND t.statusId = ?
      `
      const [ queryResult ] = await conn.query(query, [classroomIds, statusId])
      return Number((queryResult as any[])[0].total)
    }
    catch (error) { console.error(error); throw error }
    finally { if (conn) { conn.release() } }
  }

  // Índices esperados: transfer(studentId) [existe], classroom(id) [PK], teacher_class_discipline(classroomId) [existe]
  async qCreateTransfer(body: { student: { id: number }, currentClassroom: { id: number }, classroom: { id: number }, startedAt: Date | string, endedAt: Date | string | null }, qUserTeacher: qUserTeacher) {
    let conn;
    try {
      conn = await connectionPool.getConnection();
      await conn.beginTransaction();

      const [ dupRows ] = await conn.query(
        `SELECT id FROM transfer WHERE studentId = ? AND statusId = ? AND endedAt IS NULL LIMIT 1`,
        [body.student.id, TRANSFER_STATUS.PENDING]
      );
      if ((dupRows as any[])[0]) { await conn.commit(); return { outcome: 'pending_exists' as const } }

      const [ currClassRows ] = await conn.query(`SELECT id, name FROM classroom WHERE id = ? LIMIT 1`, [body.currentClassroom.id]);
      const currClass = (currClassRows as any[])[0];
      if (!currClass) { await conn.commit(); return { outcome: 'not_found' as const } }

      const [ newClassRows ] = await conn.query(
        `SELECT c.id, c.name, c.shortName, s.shortName AS school_shortName
         FROM classroom AS c LEFT JOIN school AS s ON s.id = c.schoolId
         WHERE c.id = ? LIMIT 1`,
        [body.classroom.id]
      );
      const newClass = (newClassRows as any[])[0];
      if (!newClass) { await conn.commit(); return { outcome: 'not_found' as const } }

      if (Number(newClass.name.replace(/\D/g, '')) < Number(currClass.name.replace(/\D/g, ''))) {
        await conn.commit();
        return { outcome: 'regression' as const };
      }

      const [ studentRows ] = await conn.query(
        `SELECT p.name AS person_name FROM student AS s INNER JOIN person AS p ON p.id = s.personId WHERE s.id = ? LIMIT 1`,
        [body.student.id]
      );
      const student = (studentRows as any[])[0];

      const [ teacherRows ] = await conn.query(
        `
        SELECT t.id AS teacher_id, u.email AS user_email
        FROM teacher_class_discipline AS tcd
        INNER JOIN teacher AS t ON t.id = tcd.teacherId
        INNER JOIN person AS p ON p.id = t.personId
        INNER JOIN person_category AS pc ON pc.id = p.categoryId
        LEFT JOIN user AS u ON u.personId = p.id
        WHERE tcd.classroomId = ? AND tcd.endedAt IS NULL
          AND pc.id IN (?)
        GROUP BY t.id
        ORDER BY t.id
        `,
        [currClass.id, [PER_CAT.DIRE, PER_CAT.VICE, PER_CAT.COOR, PER_CAT.SECR]]
      );

      for (const row of teacherRows as any[]) {
        if (student) { await transferEmail(row.user_email, student.person_name, newClass.shortName, qUserTeacher.person.name, newClass.school_shortName) }
      }

      const currentYear = await yearRepository.qCurrentYear();
      const status = await catalogRepository.qTransferStatus(TRANSFER_STATUS.PENDING);

      const [ insertResult ]: any = await conn.query(
        `INSERT INTO transfer (studentId, startedAt, endedAt, requesterId, requestedClassroomId, yearId, currentClassroomId, createdByUser, statusId)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          body.student.id,
          toSqlUtcDateTime(body.startedAt),
          toSqlUtcDateTime(body.endedAt),
          qUserTeacher.id,
          body.classroom.id,
          currentYear.id,
          body.currentClassroom.id,
          qUserTeacher.person.user.id,
          TRANSFER_STATUS.PENDING
        ]
      );

      await conn.commit();

      return {
        outcome: 'created' as const,
        data: {
          id: insertResult.insertId,
          student: body.student,
          startedAt: body.startedAt,
          endedAt: body.endedAt,
          requester: qUserTeacher,
          requestedClassroom: body.classroom,
          year: currentYear,
          currentClassroom: body.currentClassroom,
          createdByUser: qUserTeacher.person.user.id,
          status
        }
      };
    }
    catch (error) { if (conn) await conn.rollback(); console.error(error); throw error }
    finally { if (conn) { conn.release() } }
  }

  // Índices esperados: transfer(id) [PK], student_classroom(studentId) [existe], student_classroom(classroomId) [existe], student_classroom(yearId) [existe]
  async qUpdateTransfer(transferId: number, body: { cancel?: boolean, reject?: boolean, accept?: boolean, student?: { id: number }, classroom?: { id: number } }, qUserTeacher: qUserTeacher) {
    let conn;
    try {
      conn = await connectionPool.getConnection();
      await conn.beginTransaction();

      const [ transferRows ] = await conn.query(
        `SELECT id, requesterId, requestedClassroomId FROM transfer WHERE id = ? AND statusId = ? AND endedAt IS NULL LIMIT 1 FOR UPDATE`,
        [transferId, TRANSFER_STATUS.PENDING]
      );
      const currTransfer = (transferRows as any[])[0];

      if (!currTransfer) { await conn.commit(); return { outcome: 'not_found' as const } }

      const isAdmin = qUserTeacher.person.category.id === PER_CAT.ADMN;
      const allowedResolvers = [PER_CAT.ADMN, PER_CAT.DIRE, PER_CAT.VICE, PER_CAT.COOR, PER_CAT.SECR];

      if (body.cancel && !(isAdmin || qUserTeacher.id === currTransfer.requesterId)) {
        await conn.commit();
        return { outcome: 'forbidden_cancel' as const };
      }

      if (body.reject && !allowedResolvers.includes(qUserTeacher.person.category.id)) {
        await conn.commit();
        return { outcome: 'forbidden_reject' as const };
      }

      if (body.accept && !allowedResolvers.includes(qUserTeacher.person.category.id)) {
        await conn.commit();
        return { outcome: 'forbidden_accept' as const };
      }

      if (body.cancel) {
        await conn.query(
          `UPDATE transfer SET statusId = ?, endedAt = ?, receiverId = ?, updatedByUser = ? WHERE id = ?`,
          [TRANSFER_STATUS.CANCELED, toSqlUtcDateTime(new Date()), qUserTeacher.id, qUserTeacher.person.user.id, transferId]
        );
        await conn.commit();
        return { outcome: 'canceled' as const };
      }

      if (body.reject) {
        await conn.query(
          `UPDATE transfer SET statusId = ?, endedAt = ?, receiverId = ?, updatedByUser = ? WHERE id = ?`,
          [TRANSFER_STATUS.REFUSED, toSqlUtcDateTime(new Date()), qUserTeacher.id, qUserTeacher.person.user.id, transferId]
        );
        await conn.commit();
        return { outcome: 'rejected' as const };
      }

      if (body.accept) {
        const [ stClassRows ] = await conn.query(
          `SELECT id FROM student_classroom WHERE studentId = ? AND classroomId = ? AND endedAt IS NULL LIMIT 1`,
          [body.student?.id, body.classroom?.id]
        );
        const stClass = (stClassRows as any[])[0];
        if (!stClass) { await conn.commit(); return { outcome: 'student_classroom_not_found' as const } }

        const currentYear = await yearRepository.qCurrentYear();

        const [ lastRosterRows ] = await conn.query(
          `SELECT rosterNumber FROM student_classroom WHERE yearId = ? AND classroomId = ? ORDER BY rosterNumber DESC LIMIT 1 FOR UPDATE`,
          [currentYear.id, currTransfer.requestedClassroomId]
        );
        const last = ((lastRosterRows as any[])[0]?.rosterNumber ?? 0) + 1;

        const startedAt = new Date();
        const [ insertResult ]: any = await conn.query(
          `INSERT INTO student_classroom (studentId, classroomId, startedAt, rosterNumber, createdByUser, yearId) VALUES (?, ?, ?, ?, ?, ?)`,
          [body.student?.id, currTransfer.requestedClassroomId, toSqlUtcDateTime(startedAt), last, qUserTeacher.person.user.id, currentYear.id]
        );

        await conn.query(
          `UPDATE student_classroom SET endedAt = ?, updatedByUser = ? WHERE id = ?`,
          [toSqlUtcDateTime(new Date()), qUserTeacher.person.user.id, stClass.id]
        );

        await conn.query(
          `UPDATE transfer SET statusId = ?, endedAt = ?, receiverId = ? WHERE id = ?`,
          [TRANSFER_STATUS.ACCEPTED, toSqlUtcDateTime(new Date()), qUserTeacher.id, transferId]
        );

        await conn.commit();

        return {
          outcome: 'accepted' as const,
          data: {
            id: insertResult.insertId,
            student: body.student,
            classroom: { id: currTransfer.requestedClassroomId },
            startedAt,
            rosterNumber: last,
            createdByUser: qUserTeacher.person.user.id,
            year: currentYear
          }
        };
      }

      await conn.commit();
      return { outcome: 'noop' as const };
    }
    catch (error) { if (conn) await conn.rollback(); console.error(error); throw error }
    finally { if (conn) { conn.release() } }
  }

  async qPendingTransferStatus(year: number, status: number) {
    let conn;
    try {
      conn = await connectionPool.getConnection()
      const query =

        `
        SELECT *
        FROM transfer
        WHERE transfer.yearId = ? AND transfer.statusId = ?
      `

      const [ queryResult ] = await conn.query(query, [year, status])
      return  queryResult as Array<Transfer>
    }
    catch (error) { console.error(error); throw error }
    finally { if (conn) { conn.release() } }
  }

  async qPendingTransferBySchool(year: number, transferStatus: number, schoolId: number) {
    let conn;
    try {
      conn = await connectionPool.getConnection();
      const query =

        `
        SELECT p.name, s.ra, s.dv, c.shortName AS requestedClassroom, sh.shortName As requestedSchool, ts.name AS status, currentClassroom.shortName AS currentClassroom, currentSchool.shortName AS currentSchool
        FROM transfer AS t
         INNER JOIN student AS s ON t.studentId = s.id
         INNER JOIN person AS p ON s.personId = p.id
         INNER JOIN transfer_status AS ts ON t.statusId = ts.id
         INNER JOIN classroom AS c ON t.requestedClassroomId = c.id
         INNER JOIN classroom AS currentClassroom ON t.currentClassroomId = currentClassroom.id
         INNER JOIN school AS currentSchool ON currentClassroom.schoolId = currentSchool.id
         INNER JOIN school AS sh ON c.schoolId = sh.id
         INNER JOIN year AS y ON t.yearId = y.id
        WHERE y.id = ? AND ts.id = ? AND currentSchool.id = ?;
      `

      const [ queryResult ] = await conn.query(query, [year, transferStatus, schoolId])
      return  queryResult as Array<qPendingTransfers>
    }
    catch (error) { console.error(error); throw error }
    finally { if (conn) { conn.release() } }
  }

  async qAllPendingTransferBySchool(year: number, transferStatus: number) {
    let conn;
    try {
      conn = await connectionPool.getConnection();
      const query =

        `
        SELECT p.name, s.ra, s.dv, c.shortName AS requestedClassroom, sh.shortName As requestedSchool, ts.name AS status, currentClassroom.shortName AS currentClassroom, currentSchool.shortName AS currentSchool
        FROM transfer AS t
         INNER JOIN student AS s ON t.studentId = s.id
         INNER JOIN person AS p ON s.personId = p.id
         INNER JOIN transfer_status AS ts ON t.statusId = ts.id
         INNER JOIN classroom AS c ON t.requestedClassroomId = c.id
         INNER JOIN classroom AS currentClassroom ON t.currentClassroomId = currentClassroom.id
         INNER JOIN school AS currentSchool ON currentClassroom.schoolId = currentSchool.id
         INNER JOIN school AS sh ON c.schoolId = sh.id
         INNER JOIN year AS y ON t.yearId = y.id
        WHERE y.id = ? AND ts.id = ?
      `

      const [ queryResult ] = await conn.query(query, [year, transferStatus])
      return  queryResult as Array<qPendingTransfers>
    }
    catch (error) { console.error(error); throw error }
    finally { if (conn) { conn.release() } }
  }
}

export const transferRepository = new TransferRepository()

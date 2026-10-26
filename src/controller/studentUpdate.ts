import { connectionPool } from "../services/db";
import { GenericController } from "./genericController";
import { EntityTarget } from "typeorm";
import { Student } from "../model/Student";
import { OUT_CLASSROOMS, PER_CAT as pc, TRANSFER_STATUS } from "../utils/enums";
import { UserInterface } from "../interfaces/interfaces";
import { toSqlUtcDateTime } from "../utils/sqlDateTime";
import { yearRepository } from "../repositories/year.repository";
import { teacherRepository } from "../repositories/teacher.repository";
import { studentRepository } from "../repositories/student.repository";
import { StudentFormatter } from "../utils/formatters/student.formatter";

class StudentUpdateController extends GenericController<EntityTarget<Student>> {

  constructor() { super(Student) }

  async updateIdWithAuth(studentId: number | string, body: any, authUser: UserInterface) {
    let conn;
    try {
      const qUserTeacher = await teacherRepository.qTeacherByUser(authUser.user)

      conn = await connectionPool.getConnection();
      await conn.beginTransaction();

      const [ studentRows ] = await conn.query(
        `SELECT s.id, s.ra, s.dv, s.observationOne, s.observationTwo, s.personId, s.stateId
         FROM student s
         WHERE s.id = ?
         LIMIT 1`,
        [Number(studentId)]
      );
      const dbStudent = (studentRows as any[])[0];

      const [ classroomRows ] = await conn.query(`SELECT id, shortName FROM classroom WHERE id = ? LIMIT 1`, [Number(body.classroom)]);
      const bodyClass = (classroomRows as any[])[0];

      const [ stClassRows ] = await conn.query(
        `SELECT sc.id, sc.classroomId, c.shortName AS classroomShortName
         FROM student_classroom sc
           INNER JOIN classroom c ON c.id = sc.classroomId
         WHERE sc.id = ? AND sc.studentId = ? AND sc.endedAt IS NULL
         LIMIT 1`,
        [Number(body.currentStudentClassroomId), Number(studentId)]
      );
      const stClass = (stClassRows as any[])[0];

      if (!dbStudent) { await conn.commit(); return { status: 404, message: "Registro não encontrado" } }
      if (!stClass) { await conn.commit(); return { status: 404, message: "Registro não encontrado" } }
      if (!bodyClass) { await conn.commit(); return { status: 404, message: "Sala não encontrada" } }

      const cBodySRA: string = `${body.ra}${body.dv}`;
      const databaseStudentRa = `${dbStudent.ra}${dbStudent.dv}`;

      if (databaseStudentRa !== cBodySRA && qUserTeacher.person.category.id != pc.ADMN) {
        await conn.commit();
        return { status: 403, message: 'Você não tem permissão para modificar o RA de um aluno. Solicite ao Administrador do sistema.' }
      }

      if (databaseStudentRa !== cBodySRA) {
        const [ raExistsRows ] = await conn.query(`SELECT id FROM student WHERE ra = ? AND dv = ? LIMIT 1`, [body.ra, body.dv]);
        if ((raExistsRows as any[])[0]) { await conn.commit(); return { status: 409, message: "Já existe um aluno com esse RA" } }
      }

      const canChange: number[] = [ pc.ADMN, pc.DIRE, pc.VICE, pc.COOR, pc.SECR ]

      const message: string = "Você não tem permissão para alterar a sala de um aluno por aqui. Solicite a alguém com nível de acesso superior ao seu."
      if (!canChange.includes(qUserTeacher.person.category.id) && stClass.classroomId != bodyClass.id) {
        await conn.commit();
        return { status: 403, message };
      }

      const currentYear = await yearRepository.qCurrentYear();

      const [ pendingRows ] = await conn.query(
        `SELECT t.id, reqP.name AS requesterPersonName, rc.shortName AS requestedClassroomShortName, rsch.shortName AS requestedSchoolShortName
         FROM transfer t
           INNER JOIN teacher req ON req.id = t.requesterId
           INNER JOIN person reqP ON reqP.id = req.personId
           INNER JOIN classroom rc ON rc.id = t.requestedClassroomId
           INNER JOIN school rsch ON rsch.id = rc.schoolId
         WHERE t.studentId = ? AND t.currentClassroomId = ? AND t.statusId = ? AND t.yearId = ? AND t.endedAt IS NULL
         LIMIT 1`,
        [dbStudent.id, stClass.classroomId, TRANSFER_STATUS.PENDING, currentYear.id]
      );
      const pendingTransfer = (pendingRows as any[])[0];

      if (pendingTransfer) {
        await conn.commit();
        return { status: 403, message: `Existe um pedido de transferência ativo feito por: ${pendingTransfer.requesterPersonName} para a sala: ${pendingTransfer.requestedClassroomShortName} - ${pendingTransfer.requestedSchoolShortName}` };
      }

      if (stClass.classroomId != bodyClass.id && canChange.includes(qUserTeacher.person.category.id)) {

        const newNumber: number = Number(bodyClass.shortName.replace(/\D/g, ""))
        const oldNumber: number = Number(stClass.classroomShortName.replace(/\D/g, ""))

        if (!isNaN(newNumber) && !isNaN(oldNumber) && !OUT_CLASSROOMS.includes(bodyClass.id)) {
          if (newNumber < oldNumber) { await conn.commit(); return { status: 404, message: 'Regressão de sala não é permitido.' } }
        }

        const now = toSqlUtcDateTime(new Date());

        await conn.query(`UPDATE student_classroom SET endedAt = ?, updatedByUser = ? WHERE id = ?`, [now, qUserTeacher.person.user.id, stClass.id]);

        const [ lastRosterRows ] = await conn.query(
          `SELECT rosterNumber FROM student_classroom WHERE yearId = ? AND classroomId = ? ORDER BY rosterNumber DESC LIMIT 1 FOR UPDATE`,
          [currentYear.id, bodyClass.id]
        );
        const last = ((lastRosterRows as any[])[0]?.rosterNumber ?? 0) + 1;

        await conn.query(
          `INSERT INTO student_classroom (studentId, classroomId, yearId, rosterNumber, startedAt, createdByUser) VALUES (?, ?, ?, ?, ?, ?)`,
          [dbStudent.id, bodyClass.id, currentYear.id, last, now, qUserTeacher.person.user.id]
        );

        await conn.query(
          `INSERT INTO transfer (createdByUser, startedAt, endedAt, requesterId, requestedClassroomId, currentClassroomId, receiverId, studentId, statusId, yearId) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [qUserTeacher.person.user.id, now, now, qUserTeacher.id, bodyClass.id, stClass.classroomId, qUserTeacher.id, dbStudent.id, TRANSFER_STATUS.ACCEPTED, currentYear.id]
        );
      }

      if (stClass.classroomId === bodyClass.id) {
        await conn.query(`UPDATE student_classroom SET rosterNumber = ?, createdByUser = ? WHERE id = ?`, [body.rosterNumber, qUserTeacher.person.user.id, stClass.id]);
      }

      const [ stateRows ] = await conn.query(`SELECT id FROM state WHERE id = ? LIMIT 1`, [body.state]);
      const stateId = (stateRows as any[])[0]?.id ?? null;

      await conn.query(
        `UPDATE person SET name = ?, birth = ? WHERE id = ?`,
        [body.name.toUpperCase().trim(), toSqlUtcDateTime(body.birth), dbStudent.personId]
      );

      await conn.query(
        `UPDATE student SET ra = ?, dv = ?, updatedAt = ?, updatedByUser = ?, observationOne = ?, observationTwo = ?, stateId = ? WHERE id = ?`,
        [body.ra, body.dv, toSqlUtcDateTime(new Date()), qUserTeacher.person.user.id, body.observationOne, body.observationTwo, stateId, dbStudent.id]
      );

      const [ activeDisabilityRows ] = await conn.query(
        `SELECT id, disabilityId FROM student_disability WHERE studentId = ? AND endedAt IS NULL`,
        [dbStudent.id]
      );
      const activeDisabilities = activeDisabilityRows as { id: number, disabilityId: number }[];
      const currentDisabilityIds = activeDisabilities.map(d => d.disabilityId);
      const bodyDisabilityIds: number[] = body.disabilities ?? [];

      const toCreate = bodyDisabilityIds.filter(id => !currentDisabilityIds.includes(id));
      const toEnd = activeDisabilities.filter(d => !bodyDisabilityIds.includes(d.disabilityId));

      if (toCreate.length > 0) {
        const values = toCreate.map(disabilityId => [dbStudent.id, disabilityId, toSqlUtcDateTime(new Date()), qUserTeacher.person.user.id]);
        await conn.query(`INSERT INTO student_disability (studentId, disabilityId, startedAt, createdByUser) VALUES ?`, [values]);
      }

      for (const item of toEnd) {
        await conn.query(`UPDATE student_disability SET endedAt = ?, updatedByUser = ? WHERE id = ?`, [toSqlUtcDateTime(new Date()), qUserTeacher.person.user.id, item.id]);
      }

      await conn.commit();

      const fullDetail = await studentRepository.qStudentFullDetail(Number(studentId));
      const result = StudentFormatter.studentDetail(fullDetail);

      return { status: 200, data: result };
    }
    catch (error: any) { if (conn) await conn.rollback(); console.error(error); return { status: 500, message: error.message } }
    finally { if (conn) { conn.release() } }
  }
}

export const studentUpdateController = new StudentUpdateController();

import { AppDataSource } from '../data-source';
import { GenericController } from "./genericController";
import { Brackets, DeepPartial, EntityTarget, FindManyOptions, IsNull, ObjectLiteral, SaveOptions} from "typeorm";
import { Transfer } from "../model/Transfer";
import { TRANSFER_STATUS } from "../utils/enums";
import { StudentClassroom } from "../model/StudentClassroom";
import { Request } from "express";
import { Classroom } from "../model/Classroom";
import { TransferStatus } from '../model/TransferStatus';
import { Teacher } from "../model/Teacher";
import { transferEmail } from "../services/email";
import { Student } from "../model/Student";
import { PER_CAT } from "../utils/enums";
import { Year } from "../model/Year";
import {connectionPool} from "../services/db";
import {format} from "mysql2";

class TransferController extends GenericController<EntityTarget<Transfer>> {

  constructor() { super(Transfer) }

  async findAllWhere(_: any, request?: Request) {

    const year = request?.params.year as string;
    const rawSearch = (request?.query.search as string) ?? "";
    const search = `%${rawSearch}%`;

    const limit = !isNaN(parseInt(request?.query.limit as string)) ? parseInt(request?.query.limit as string) : 100;
    const offset = !isNaN(parseInt(request?.query.offset as string)) ? parseInt(request?.query.offset as string) : 0;

    let conn;
    try {
      conn = await connectionPool.getConnection();
      const query = `
      SELECT 
        t.id AS transfer_id,
        t.startedAt AS transfer_startedAt,
        t.endedAt AS transfer_endedAt,
        
        ts.id AS status_id,
        ts.name AS status_name,
        
        y.id AS year_id,
        y.name AS year_name,
        
        req.id AS requester_id,
        reqP.id AS requesterPerson_id,
        reqP.name AS requesterPerson_name,
        
        stu.id AS student_id,
        stu.ra AS student_ra,
        stu.dv AS student_dv,
        stuP.id AS studentPerson_id,
        stuP.name AS studentPerson_name,
        
        rec.id AS receiver_id,
        recP.id AS receiverPerson_id,
        recP.name AS receiverPerson_name,
        
        reqC.id AS requestedClassroom_id,
        reqC.name AS requestedClassroom_name,
        reqC.shortName AS requestedClassroom_shortName,
        reqS.id AS school_id,
        reqS.name AS school_name,
        reqS.shortName AS school_shortName,
        
        curC.id AS currentClassroom_id,
        curC.name AS currentClassroom_name,
        curC.shortName AS currentClassroom_shortName,
        curS.id AS currentSchool_id,
        curS.name AS currentSchool_name,
        curS.shortName AS currentSchool_shortName

      FROM transfer t
      LEFT JOIN transfer_status ts ON t.statusId = ts.id
      LEFT JOIN year y ON t.yearId = y.id
      
      -- Requester e Receiver agora buscam da tabela teacher, conforme suas models
      LEFT JOIN teacher req ON t.requesterId = req.id
      LEFT JOIN person reqP ON req.personId = reqP.id
      
      LEFT JOIN student stu ON t.studentId = stu.id
      LEFT JOIN person stuP ON stu.personId = stuP.id
      
      LEFT JOIN teacher rec ON t.receiverId = rec.id
      LEFT JOIN person recP ON rec.personId = recP.id
      
      LEFT JOIN classroom reqC ON t.requestedClassroomId = reqC.id
      LEFT JOIN school reqS ON reqC.schoolId = reqS.id
      
      LEFT JOIN classroom curC ON t.currentClassroomId = curC.id
      LEFT JOIN school curS ON curC.schoolId = curS.id
      
      WHERE y.name = ?
      AND (
        stuP.name COLLATE utf8mb4_unicode_ci LIKE ? OR
        stu.ra LIKE ? OR
        reqP.name COLLATE utf8mb4_unicode_ci LIKE ? OR
        recP.name COLLATE utf8mb4_unicode_ci LIKE ? OR
        reqS.name COLLATE utf8mb4_unicode_ci LIKE ? OR
        curS.name COLLATE utf8mb4_unicode_ci LIKE ? OR
        reqS.shortName COLLATE utf8mb4_unicode_ci LIKE ? OR
        curS.shortName COLLATE utf8mb4_unicode_ci LIKE ?
      )
      ORDER BY t.id DESC
      LIMIT ? OFFSET ?;
    `;

      const queryParams = [
        year,
        search, search, search, search, search, search, search, search, // 8 parâmetros do LIKE
        limit, offset
      ];

      const [rows] = await conn.query(format(query), queryParams) as Array<any>;

      const result = rows.map((row: any) => ({
        id: row.transfer_id,
        startedAt: row.transfer_startedAt,
        endedAt: row.transfer_endedAt,

        status: row.status_id ? {
          id: row.status_id,
          name: row.status_name
        } : null,

        year: row.year_id ? {
          id: row.year_id,
          name: row.year_name
        } : null,

        requester: row.requester_id ? {
          id: row.requester_id,
          person: row.requesterPerson_id ? { id: row.requesterPerson_id, name: row.requesterPerson_name } : null
        } : null,

        student: row.student_id ? {
          id: row.student_id,
          ra: row.student_ra,
          dv: row.student_dv,
          person: row.studentPerson_id ? { id: row.studentPerson_id, name: row.studentPerson_name } : null
        } : null,

        receiver: row.receiver_id ? {
          id: row.receiver_id,
          person: row.receiverPerson_id ? { id: row.receiverPerson_id, name: row.receiverPerson_name } : null
        } : null,

        requestedClassroom: row.requestedClassroom_id ? {
          id: row.requestedClassroom_id,
          name: row.requestedClassroom_name,
          shortName: row.requestedClassroom_shortName,
          school: row.school_id ? { id: row.school_id, name: row.school_name, shortName: row.school_shortName } : null
        } : null,

        currentClassroom: row.currentClassroom_id ? {
          id: row.currentClassroom_id,
          name: row.currentClassroom_name,
          shortName: row.currentClassroom_shortName,
          school: row.currentSchool_id ? { id: row.currentSchool_id, name: row.currentSchool_name, shortName: row.currentSchool_shortName } : null
        } : null
      }));

      return { status: 200, data: result };
    }
    catch (error: any) { console.error(error); return { status: 500, message: error.message } }
    finally { if (conn) { conn.release() } }
  }

  override async save(body: DeepPartial<ObjectLiteral>, options: SaveOptions | undefined) {
    try {
      return await AppDataSource.transaction(async(CONN) => {

        const qUserTeacher = await this.qTeacherByUser(body.user.user)

        const dbTransfer: Transfer | null = await CONN.findOne(Transfer, { where: { student: body.student, status: { id: TRANSFER_STATUS.PENDING }, endedAt: IsNull()}})

        if (dbTransfer) return { status: 400, message: 'Já existe uma solicitação pendente para este aluno' }

        const currClass: Classroom | null = await CONN.findOne(Classroom, { where: { id: body.currentClassroom.id } })
        const newClass: Classroom | null = await CONN.findOne(Classroom, { relations: [ 'school' ], where: { id: body.classroom.id } })

        if (!currClass) return { status: 404, message: 'Registro não encontrado' }
        if (!newClass) return { status: 404, message: 'Registro não encontrado' }

        if (Number(newClass.name.replace(/\D/g, '')) < Number(currClass.name.replace(/\D/g, ''))) { return { status: 400, message: 'Regressão de sala não é permitido.' } }

        const student: Student | null = await CONN.findOne(Student, { relations: ['person'], where: { id: body.student.id } })

        const teachers = await CONN.getRepository(Teacher)
          .createQueryBuilder("teacher")
          .select(["teacher.id AS teacher_id", "user.id AS user_id", "user.email AS user_email"])
          .leftJoin("teacher.person", "person")
          .leftJoin("person.user", "user")
          .leftJoin("person.category", "category")
          .leftJoin("teacher.teacherClassDiscipline", "teacherClassDiscipline")
          .leftJoin("teacherClassDiscipline.classroom", "classroom")
          .where("classroom.id = :classroomId AND teacherClassDiscipline.endedAt IS NULL", { classroomId: currClass.id })
          .andWhere("category.id IN (:categoryId3, :categoryId4, :categoryId5, :categoryId6)", { categoryId3: 3, categoryId4: 4, categoryId5: 5, categoryId6: 6 })
          .groupBy("teacher.id")
          .orderBy("teacher_id")
          .getRawMany() as { teacher_id: number, user_id: number, user_email: string }[];

        for(let el of teachers) {
          if(student) { await transferEmail(el.user_email, student.person.name, newClass.shortName, qUserTeacher.person.name, newClass.school.shortName) }
        }

        const transfer = new Transfer();
        transfer.student = body.student;
        transfer.startedAt = body.startedAt;
        transfer.endedAt = body.endedAt;
        transfer.requester = qUserTeacher as Teacher;
        transfer.requestedClassroom = body.classroom;
        transfer.year = await this.qCurrentYear() as unknown as Year
        transfer.currentClassroom = body.currentClassroom;
        transfer.createdByUser = qUserTeacher.person.user.id;
        transfer.status = await this.qTransferStatus(TRANSFER_STATUS.PENDING) as TransferStatus
        const result = await CONN.save(Transfer, transfer)

        return { status: 201, data: result }
      })
    }
    catch (error: any) { return { status: 500, message: error.message } }
  }

  override async updateId(transferId: number | string, body: ObjectLiteral) {
    try {
      return await AppDataSource.transaction(async(CONN) => {

        const qUserTeacher = await this.qTeacherByUser(body.user.user)

        const currTransfer = await CONN.findOne(Transfer, {
          relations: ['status', 'requester.person', 'requestedClassroom'],
          where: { id: Number(transferId), status: { id: TRANSFER_STATUS.PENDING }, endedAt: IsNull() }
        })

        const isAdmin = qUserTeacher.person.category.id === PER_CAT.ADMN;

        if (!currTransfer) return { status: 404, message: 'Transferência já processada ou não localizada. Atualize sua página.' }

        if(body.cancel && !(isAdmin || qUserTeacher.id === currTransfer.requester.id)) {
          return { status: 403, message: 'Você não pode modificar uma solicitação de transferência feita por outra pessoa.' }
        }

        if(body.reject && ![PER_CAT.ADMN, PER_CAT.DIRE, PER_CAT.VICE, PER_CAT.COOR, PER_CAT.SECR].includes(qUserTeacher.person.category.id)) {
          return { status: 403, message: 'O seu cargo não permite realizar a RECUSA de uma solicitação de transferência.' }
        }

        if(body.accept && ![PER_CAT.ADMN, PER_CAT.DIRE, PER_CAT.VICE, PER_CAT.COOR, PER_CAT.SECR].includes(qUserTeacher.person.category.id)) {
          return { status: 403, message: 'O seu cargo não permite realizar o ACEITE de uma solicitação de transferência.' }
        }

        if (body.cancel) {
          currTransfer.status = await this.qTransferStatus(TRANSFER_STATUS.CANCELED) as TransferStatus
          currTransfer.endedAt = new Date()
          currTransfer.receiver = qUserTeacher as Teacher
          currTransfer.updatedByUser = qUserTeacher.person.user.id
          await CONN.save(Transfer, currTransfer)
          return { status: 200, data: 'Cancelada com sucesso.' }
        }

        if (body.reject) {

          currTransfer.status = await this.qTransferStatus(TRANSFER_STATUS.REFUSED) as TransferStatus
          currTransfer.endedAt = new Date()
          currTransfer.receiver = qUserTeacher as Teacher
          currTransfer.updatedByUser = qUserTeacher.person.user.id
          await CONN.save(Transfer, currTransfer)
          return { status: 200, data: 'Rejeitada com sucesso.' }
        }

        if (body.accept) {

          const relations = [ 'student', 'classroom', 'year' ]

          const stClass = await CONN.findOne(StudentClassroom, { relations: relations, where: { student: body.student, classroom: body.classroom, endedAt: IsNull() }})

          if (!stClass) { return { status: 404, message: 'Registro não encontrado.' } }

          const currentYear = await this.qCurrentYear()

          const lastRosterNumber = await CONN.find(StudentClassroom, { relations: ['classroom', 'year'], where: { year: { id: currentYear.id }, classroom: { id: currTransfer.requestedClassroom.id }}, order: { rosterNumber: 'DESC' }, take: 1 })

          let last = 1
          if (lastRosterNumber[0]?.rosterNumber) { last = lastRosterNumber[0].rosterNumber + 1 }

          const newStudentClassroom = await CONN.save(StudentClassroom, {
            student: body.student,
            classroom: currTransfer.requestedClassroom,
            startedAt: new Date(),
            rosterNumber: last,
            createdByUser: qUserTeacher.person.user.id,
            year: await this.qCurrentYear()
          }) as StudentClassroom

          await CONN.save(StudentClassroom, { ...stClass, endedAt: new Date(), updatedByUser: qUserTeacher.person.user.id })

          currTransfer.status = await this.qTransferStatus(TRANSFER_STATUS.ACCEPTED) as TransferStatus
          currTransfer.endedAt = new Date()
          currTransfer.receiver = qUserTeacher as Teacher

          await CONN.save(Transfer, currTransfer)
          return { status: 200, data: newStudentClassroom }
        }
        let data = {}
        return { status: 200, data };
      })
    }
    catch (error: any) { return { status: 500, message: error.message } }
  }
}

export const transferController = new TransferController();

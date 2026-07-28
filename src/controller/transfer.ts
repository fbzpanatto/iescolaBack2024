import { GenericController } from "./genericController";
import { DeepPartial, EntityTarget, FindManyOptions, ObjectLiteral, SaveOptions } from "typeorm";
import { Transfer } from "../model/Transfer";
import { Request } from "express";
import { JwtPayload } from "../interfaces/interfaces";
import {connectionPool} from "../services/db";
import {format} from "mysql2";

class TransferController extends GenericController<EntityTarget<Transfer>> {

  constructor() {
    super(Transfer, { table: 'transfer', selectColumns: ['id', 'startedAt', 'endedAt'], dateColumns: ['startedAt', 'endedAt'] })
  }

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
        startedAt: new Date(row.transfer_startedAt.replace(' ', 'T') + 'Z'),
        endedAt: row.transfer_endedAt ? new Date(row.transfer_endedAt.replace(' ', 'T') + 'Z') : null,

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

  async saveWithAuth(body: DeepPartial<ObjectLiteral>, authUser: JwtPayload, options: SaveOptions | undefined) {
    try {
      const qUserTeacher = await this.qTeacherByUser(authUser.user)
      const result = await this.qCreateTransfer(body as any, qUserTeacher)

      if (result.outcome === 'pending_exists') { return { status: 400, message: 'Já existe uma solicitação pendente para este aluno' } }
      if (result.outcome === 'not_found') { return { status: 404, message: 'Registro não encontrado' } }
      if (result.outcome === 'regression') { return { status: 400, message: 'Regressão de sala não é permitido.' } }

      return { status: 201, data: result.data }
    }
    catch (error: any) { return { status: 500, message: error.message } }
  }

  async updateIdWithAuth(transferId: number | string, body: ObjectLiteral, authUser: JwtPayload) {
    try {
      const qUserTeacher = await this.qTeacherByUser(authUser.user)
      const result = await this.qUpdateTransfer(Number(transferId), body as any, qUserTeacher)

      if (result.outcome === 'not_found') { return { status: 404, message: 'Transferência já processada ou não localizada. Atualize sua página.' } }
      if (result.outcome === 'forbidden_cancel') { return { status: 403, message: 'Você não pode modificar uma solicitação de transferência feita por outra pessoa.' } }
      if (result.outcome === 'forbidden_reject') { return { status: 403, message: 'O seu cargo não permite realizar a RECUSA de uma solicitação de transferência.' } }
      if (result.outcome === 'forbidden_accept') { return { status: 403, message: 'O seu cargo não permite realizar o ACEITE de uma solicitação de transferência.' } }
      if (result.outcome === 'student_classroom_not_found') { return { status: 404, message: 'Registro não encontrado.' } }
      if (result.outcome === 'canceled') { return { status: 200, data: 'Cancelada com sucesso.' } }
      if (result.outcome === 'rejected') { return { status: 200, data: 'Rejeitada com sucesso.' } }
      if (result.outcome === 'accepted') { return { status: 200, data: result.data } }

      return { status: 200, data: {} };
    }
    catch (error: any) { return { status: 500, message: error.message } }
  }
}

export const transferController = new TransferController();

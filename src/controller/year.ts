import { GenericController } from "./genericController";
import { EntityTarget, FindManyOptions, ObjectLiteral } from "typeorm";
import { Year } from "../model/Year";
import { Request } from "express";
import { PER_CAT, TRANSFER_STATUS } from "../utils/enums";
import { JwtPayload } from "../interfaces/interfaces";
import { Helper } from "../utils/helpers";

class YearController extends GenericController<EntityTarget<Year>> {
  constructor() {
    super(Year, { table: 'year', selectColumns: ['id', 'name', 'active', 'createdAt', 'endedAt'], booleanColumns: ['active'], dateColumns: ['createdAt', 'endedAt'] })
  }

  override async findAllWhere(op: FindManyOptions<ObjectLiteral> | undefined, request?: Request) {
    const search = request?.query.search as string
    try {
      const rows = await this.qYearsWithPeriods(search)
      return { status: 200, data: Helper.years(rows) };
    } catch (error: any) { return { status: 500, message: error.message } }
  }

  async saveWithAuth(body: any, authUser: JwtPayload) {
    try {
      const qUserTeacher = await this.qTeacherByUser(authUser.user)
      const canCreate = [PER_CAT.ADMN]
      if (!canCreate.includes(qUserTeacher.person.category.id)) { return { status: 403, message: 'Você não tem permissão para criar um ano letivo. Solicite a um Administrador do sistema.' }}

      const createdAt = body.createdAt ?? new Date()
      const endedAt = body.endedAt ?? null

      const result = await this.qCreateYear(body.name, createdAt, endedAt, body.active)

      if (result.outcome === 'duplicate') { return { status: 404, message: `O ano ${body.name} já existe.` } }
      if (result.outcome === 'active_year_exists') { return { status: 404, message: `O ano ${result.name} está ativo. Encerre-o antes de criar um novo.` } }

      const data = { id: result.id, name: result.name, active: true, createdAt, endedAt }
      return { status: 201, data };
    }
    catch (error: any) { return { status: 500, message: error.message } }
  }

  async updateIdWithAuth(id: any, body: any, authUser: JwtPayload) {
    try {
      const qUserTeacher = await this.qTeacherByUser(authUser.user)

      const result = await this.qUpdateYear(Number(id), body, qUserTeacher.id, TRANSFER_STATUS.PENDING, TRANSFER_STATUS.ACCEPTED)

      if (result.outcome === 'not_found') { return { status: 404, message: 'Data not found' } }
      if (result.outcome === 'duplicate') { return { status: 400, message: `O ano ${body.name} já existe.` } }
      if (result.outcome === 'active_conflict') { return { status: 400, message: `O ano ${result.name} está ativo.` } }
      if (result.outcome === 'ended_at_required') { return { status: 400, message: 'Data de encerramento não pode ser vazia.' } }

      return { status: 200, data: result.data };
    } catch (error: any) { return { status: 500, message: error.message } }
  }
}

export const yearController = new YearController();

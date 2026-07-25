import { GenericController } from "./genericController";
import { EntityTarget, FindManyOptions, ObjectLiteral } from "typeorm";
import { Skill } from "../model/Skill";
import { Request } from "express";
import { connectionPool } from "../services/db";

class SkillController extends GenericController<EntityTarget<Skill>> {

  constructor() {
    super(Skill, {
      table: 'skill',
      selectColumns: ['id', 'reference', 'description', 'createdAt', 'updatedAt', 'createdByUser', 'updatedByUser'],
      relations: { classroomCategory: 'classroomCategoryId', discipline: 'disciplineId' }
    })
  }

  override async findAllWhere(_: FindManyOptions<ObjectLiteral> | undefined, request?: Request) {
    const classCategoryId = Number(request?.query.category);
    const disciplineId = Number(request?.query.discipline);
    let conn;
    try {
      conn = await connectionPool.getConnection();
      const [rows] = await conn.query(
        `SELECT id, reference, description, createdAt, updatedAt, createdByUser, updatedByUser FROM skill WHERE classroomCategoryId = ? AND disciplineId = ?`,
        [classCategoryId, disciplineId]
      );
      return { status: 200, data: rows };
    } catch (error: any) { return { status: 500, message: error.message } }
    finally { if (conn) { conn.release() } }
  }
}

export const skillController = new SkillController();

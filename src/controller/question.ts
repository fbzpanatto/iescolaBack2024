import { GenericController } from "./genericController";
import { EntityTarget } from "typeorm";
import { Question } from "../model/Question";
import { Request } from "express";
import { connectionPool } from "../services/db";
import { PER_CAT } from "../utils/enums";
import { JwtPayload } from "../interfaces/interfaces";

class QuestionController extends GenericController<EntityTarget<Question>> {
  constructor() {
    super(Question, {
      table: 'question',
      selectColumns: ['id', 'title', 'classroomNumber', 'active', 'createdAt', 'updatedAt', 'createdByUser', 'updatedByUser'],
      relations: { discipline: 'disciplineId', classroomCategory: 'classroomCategoryId', skill: 'skillId', person: 'personId' },
      booleanColumns: ['active'],
      dateColumns: ['createdAt', 'updatedAt']
    })
  }

  async isOwner(req: Request, authUser: JwtPayload) {
    const { id: questionId } = req.params

    let conn;
    try {
      const qUserTeacher = await this.qTeacherByUser(authUser.user)

      const masterUser = qUserTeacher.person.category.id === PER_CAT.ADMN || qUserTeacher.person.category.id === PER_CAT.SUPE || qUserTeacher.person.category.id === PER_CAT.FORM;

      conn = await connectionPool.getConnection();
      const [rows] = await conn.query(`SELECT personId FROM question WHERE id = ? LIMIT 1`, [parseInt(questionId as string)]);
      const question = (rows as any[])[0];

      return { status: 200, data: { isOwner: qUserTeacher.person.id === question?.personId || masterUser } };
    }
    catch (error: any) { return { status: 500, message: error.message } }
    finally { if (conn) { conn.release() } }
  }

  async questionForm(_: Request) {
    try {
      const classroomCategories = await this.qClassroomCategories()
      const groups = await this.qQuestionGroups()
      return { status: 200, data: { classroomCategories, groups } };
    } catch (error: any) { return { status: 500, message: error.message } }
  }

  async allQuestions(req: Request) {
    try {
      const questions = await this.qAllQuestions(Number(req.query.discipline));
      return { status: 200, data: questions };
    } catch (error: any) { return { status: 500, message: error.message } }
  }
}

export const quesCtrl = new QuestionController();

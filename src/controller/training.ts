import { Request } from "express";
import { Training } from "../model/Training";
import { EntityTarget } from "typeorm";
import { dbConn } from "../services/db";
import { GenericController } from "./genericController";
import { TrainingAndSchedulesBody } from "../interfaces/interfaces";
import { PoolConnection } from "mysql2/promise";

class TrainingController extends GenericController<EntityTarget<Training>> {
  constructor() { super(Training) }

  async getAll(req: Request) {

    let conn: PoolConnection | null = null;

    const { year } = req.params;
    const { search, peb, limit, offset } = req.query;

    try {
      conn = await dbConn();

      const qYear = await this.qYearByName(conn, year);

      const trainings = await this.qTrainings(conn, qYear.id, search as string, parseInt(peb as string), parseInt(limit as string), parseInt(offset as string));

      return { status: 200, data: trainings };
    }
    catch (error: any) { return { status: 500, message: error.message } }
    finally { if(conn) { conn.release() } }
  }

  async getOne(req: Request) {

    let conn: PoolConnection | null = null;

    const { id } = req.params;

    try {
      conn = await dbConn();

      const result = await this.qOneTraining(conn, parseInt(id));

      return { status: 200, data: result };
    }
    catch (error: any) { return { status: 500, message: error.message } }
    finally { if(conn) { conn.release() } }
  }

  async presence(req: Request) {

    let conn: PoolConnection | null = null;

    const { id } = req.params;

    try {
      conn = await dbConn();

      const result = {}

      return { status: 200, data: result };
    }
    catch (error: any) { return { status: 500, message: error.message } }
    finally { if(conn) { conn.release() } }
  }

  async trainingForm(_: Request) {

    let sqlConnection = await dbConn()

    try {
      const classroomCategories = await this.qClassroomCategories(sqlConnection);
      const disciplines = await this.qDisciplines(sqlConnection);
      const months = await this.qTraningSchedulesMonthReference(sqlConnection);
      const classrooms = await this.qNumberClassrooms(sqlConnection)
      return { status: 200, data: { classrooms, classroomCategories, disciplines, months } };
    }
    catch (error: any) { return { status: 500, message: error.message } }
    finally { if(sqlConnection) { sqlConnection.release() } }
  }

  async saveTraining(body: TrainingAndSchedulesBody) {

    let conn = await dbConn();

    try {

      const { name, classroom, discipline, category, observation, trainingSchedules, month } = body;

      await conn.beginTransaction();

      const currentYear = await this.qCurrentYear(conn);

      const teacher = await this.qTeacherByUser(conn, body.user.user);

      const training = await this.qNewTraining(conn, currentYear.id, name, category, month, classroom, teacher.person.user.id, discipline, observation);

      await this.qNewTrainingSchedules(conn, training.insertId, teacher.person.user.id, trainingSchedules);

      await conn.commit();

      return { status: 201, data: { message: 'OK', trainingId: training.insertId } };
    }
    catch (error: any) { if(conn){ await conn.rollback() } return { status: 500, message: error.message } }
    finally { if(conn) { conn.release() } }
  }

  async updateTraining(id: string, body: TrainingAndSchedulesBody) {

    let conn = await dbConn();

    try {

      const trainingId = parseInt(id);
      if (isNaN(trainingId)) { return { status: 400, message: 'ID inválido' } }

      const { name, classroom, discipline, category, observation, trainingSchedules } = body;

      const existingTraining = await this.qOneTraining(conn, trainingId);
      if (!existingTraining) { return { status: 404, message: 'Training não encontrado' } }

      await conn.beginTransaction();

      const teacher = await this.qTeacherByUser(conn, body.user.user);

      await this.qUpdateTraining(conn, trainingId, name, category, classroom, teacher.person.user.id, discipline, observation);

      await this.qUpdateTrainingSchedules(conn, trainingId, teacher.person.user.id, trainingSchedules);

      await conn.commit();

      return { status: 200, data: { message: 'Training atualizado com sucesso' } };
    }
    catch (error: any) {
      if (conn) { await conn.rollback() }
      console.error('Erro ao atualizar training:', error);
      return { status: 500, message: error.message };
    }
    finally { if (conn) { conn.release() } }
  }
}

export const trainingController = new TrainingController();
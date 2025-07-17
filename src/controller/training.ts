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

  async trainingForm(req: Request) {

    let sqlConnection = await dbConn()

    try {
      const classroomCategories = await this.qClassroomCategories(sqlConnection);
      const disciplines = await this.qDisciplines(sqlConnection);
      const classrooms = await this.qNumberClassrooms(sqlConnection)
      return { status: 200, data: { classrooms, classroomCategories, disciplines } };
    }
    catch (error: any) { return { status: 500, message: error.message } }
    finally { if(sqlConnection) { sqlConnection.release() } }
  }

  async saveTraining(body: TrainingAndSchedulesBody) {

    let conn = await dbConn();

    try {

      const { name, classroom, discipline, category, observation, trainingSchedules } = body;

      await conn.beginTransaction();

      const currentYear = await this.qCurrentYear(conn);

      const teacher = await this.qTeacherByUser(conn, body.user.user);

      const training = await this.qNewTraining(conn, currentYear.id, name, category, classroom, teacher.person.user.id, discipline, observation);

      await this.qNewTrainingSchedules(conn, training.insertId, teacher.person.user.id, trainingSchedules);

      await conn.commit();

      return { status: 201, data: { message: 'OK', trainingId: training.insertId } };
    }
    catch (error: any) { if(conn){ await conn.rollback() } return { status: 500, message: error.message } }
    finally { if(conn) { conn.release() } }
  }

  async updateTraining(id: string, body: {[key: string]: any }) {

    let conn = await dbConn()

    try {

      return { status: 204, data: { message: 'done.' } }
    }
    catch (error: any) { return { status: 500, message: error.message } }
    finally { if(conn) { conn.release() } }

  }
}

export const trainingController = new TrainingController();
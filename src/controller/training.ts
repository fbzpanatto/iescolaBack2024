import { Request } from "express";
import { Training } from "../model/Training";
import { EntityTarget } from "typeorm";
import { dbConn } from "../services/db";
import { GenericController } from "./genericController";
import {TrainingAndSchedulesBody, UserInterface} from "../interfaces/interfaces";
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

  async presenceTeachersByCategory(req: Request) {
    let conn: PoolConnection | null = null;
    const { reference } = req.query;
    const body = req.body

    try {
      conn = await dbConn();

      const teacher = await this.qTeacherByUser(conn, body.user.user);

      const cYear = await this.qCurrentYear(conn)

      const refTraining = await this.qPresence(conn, parseInt(reference as string));

      if (!refTraining) { return { status: 404, message: 'Training não encontrado' } }

      const refTrainingYear = await this.qYearById(conn, refTraining.yearId);

      const allTrainings = await this.qAllReferencedTrainings(conn, refTraining);

      const trainingIds = allTrainings.map(t => t.id);

      const preFundI = await this.qTeachersByCategory(conn, refTraining, cYear.id === refTraining.yearId, refTrainingYear.name, teacher);

      const contracts = await this.qContracts(conn);

      const status = await this.qTeacherTrainingStatus(conn);

      const allReferencedTeachers = await this.qTeacherTrainings(conn, preFundI, trainingIds, refTraining.categoryId, cYear.id === refTraining.yearId, refTrainingYear.name)

      return { status: 200, data: { allReferencedTrainings: allTrainings, allReferencedTeachers, contracts, status } };
    }
    catch (error: any) { console.log(error); return { status: 500, message: error.message } }
    finally { if (conn) { conn.release() }
    }
  }

  async trainingForm(_: Request) {

    let sqlConnection = await dbConn()

    try {
      const classroomCategories = await this.qClassroomCategories(sqlConnection);
      const disciplines = await this.qDisciplines(sqlConnection);
      const months = await this.qTrainingSchedulesMonthReference(sqlConnection);
      const classrooms = await this.qNumberClassrooms(sqlConnection);
      const meetings = await this.qTrainingSchedulesMeetings(sqlConnection);
      return { status: 200, data: { classrooms, classroomCategories, disciplines, months, meetings } };
    }
    catch (error: any) { return { status: 500, message: error.message } }
    finally { if(sqlConnection) { sqlConnection.release() } }
  }

  async saveTraining(body: TrainingAndSchedulesBody) {

    let conn = await dbConn();

    try {

      const { classroom, discipline, category, observation, month, meeting } = body;

      await conn.beginTransaction();

      const currentYear = await this.qCurrentYear(conn);

      const teacher = await this.qTeacherByUser(conn, body.user.user);

      const training = await this.qNewTraining(conn, currentYear.id, category, month, meeting, classroom, teacher.person.user.id, discipline, observation);

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

      const { classroom, discipline, category, observation, month, meeting } = body;

      const existingTraining = await this.qOneTraining(conn, trainingId);
      if (!existingTraining) { return { status: 404, message: 'Training não encontrado' } }

      await conn.beginTransaction();

      const teacher = await this.qTeacherByUser(conn, body.user.user);

      await this.qUpdateTraining(conn, trainingId, meeting, category, month, classroom, teacher.person.user.id, discipline, observation);

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

  async updateTeacherTrainingStatus(body: { user: UserInterface, teacherId: number, statusId: number, trainingId: number }) {

    let conn = await dbConn();

    try {

      const existingTraining = await this.qOneTraining(conn, body.trainingId);
      if (!existingTraining) { return { status: 404, message: 'Training não encontrado' } }

      await conn.beginTransaction();

      const teacher = await this.qTeacherByUser(conn, body.user.user);

      await this.qUpsertTrainingTeacher(conn, body.teacherId, body.trainingId, body.statusId, teacher.person.user.id );

      await conn.commit();

      return { status: 200, data: { message: 'Status do professor no training atualizado com sucesso' } };
    }
    catch (error: any) {
      if (conn) { await conn.rollback() }
      console.error('Erro ao atualizar training teacher:', error);
      return { status: 500, message: error.message };
    }
    finally { if (conn) { conn.release() } }
  }

  async updateTeacherTrainingObservation(body: { user: UserInterface, teacherId: number, observation: string, trainingId: number }) {

    let conn = await dbConn();

    try {

      const existingTraining = await this.qOneTraining(conn, body.trainingId);
      if (!existingTraining) { return { status: 404, message: 'Training não encontrado' } }

      await conn.beginTransaction();

      const teacher = await this.qTeacherByUser(conn, body.user.user);

      await this.qUpsertTrainingTeacherObs(conn, body.teacherId, body.trainingId, body.observation, teacher.person.user.id );

      await conn.commit();

      return { status: 200, data: { message: 'Status do professor no training atualizado com sucesso' } };
    }
    catch (error: any) {
      if (conn) { await conn.rollback() }
      console.error('Erro ao atualizar training teacher:', error);
      return { status: 500, message: error.message };
    }
    finally { if (conn) { conn.release() } }
  }
}

export const trainingController = new TrainingController();
import { Request } from "express";
import { Training } from "../model/Training";
import { EntityTarget } from "typeorm";
import { dbConn } from "../services/db";
import { GenericController } from "./genericController";

class TrainingController extends GenericController<EntityTarget<Training>> {
  constructor() { super(Training) }

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

  async saveTraining(body: {[key: string]: any}) {

    let sqlConnection = await dbConn()

    try {

      console.log('body', body)

      return { status: 201, data: {} }
    }
    catch (error: any) { return { status: 500, message: error.message } }
    finally { if(sqlConnection) { sqlConnection.release() } }
  }

  async updateTraining(id: string, body: {[key: string]: any }) {

    let sqlConnection = await dbConn()

    try {

      return { status: 201, data: { message: 'done.' } }
    }
    catch (error: any) { return { status: 500, message: error.message } }
    finally { if(sqlConnection) { sqlConnection.release() } }

  }
}

export const trainingController = new TrainingController();
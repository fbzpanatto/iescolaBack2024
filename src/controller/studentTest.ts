import { Request } from "express";
import { dbConn } from "../services/db";
import { Student } from "../model/Student";
import { GenericController } from "./genericController";

class StudentTestController extends GenericController<any> {

  constructor() { super(Student) }

  async allStudents(req: Request) {

    let sqlConnection = await dbConn()

    try {

      console.log('StudentTestController')

      console.log(req.body)

      return { status: 200, data: [] }

    }

    catch (error: any) { return { status: 500, message: error.message } }

    finally { if(sqlConnection) { sqlConnection.release() } }
  }

}

export const studentTestController = new StudentTestController()
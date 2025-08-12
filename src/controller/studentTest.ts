import { dbConn } from "../services/db";
import { Student } from "../model/Student";
import { GenericController } from "./genericController";

class StudentTestController extends GenericController<any> {

  constructor() { super(Student) }

  async allStudents(body: { user: { user: number, ra: string, category: number } }, params: { [key: string]: any }) {

    let sqlConnection = await dbConn()

    try {

      const year = params.year;
      const studentId = body.user.user
      console.log(studentId, year)

      return { status: 200, data: [] }

    }

    catch (error: any) { return { status: 500, message: error.message } }

    finally { if(sqlConnection) { sqlConnection.release() } }
  }

}

export const studentTestController = new StudentTestController()
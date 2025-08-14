import { dbConn } from "../services/db";
import { Student } from "../model/Student";
import { GenericController } from "./genericController";
import { TestByStudentId } from "../interfaces/interfaces";

class StudentTestController extends GenericController<any> {

  constructor() { super(Student) }

  async allStudents(body: { user: { user: number, ra: string, category: number } }, params: { [key: string]: any }, query: { [key: string]: any }) {

    let sqlConnection = await dbConn()

    try {

      const { search, limit: l, offset: o } = query;

      const limit =  !isNaN(parseInt(l as string)) ? parseInt(l as string) : 100
      const offset =  !isNaN(parseInt(o as string)) ? parseInt(o as string) : 0

      const year = params.year;
      const studentId = body.user.user

      const result = await this.qTestByStudentId<TestByStudentId>(sqlConnection, studentId, year, search, limit, offset)

      return { status: 200, data: result }

    }

    catch (error: any) { return { status: 500, message: error.message } }

    finally { if(sqlConnection) { sqlConnection.release() } }
  }

}

export const studentTestController = new StudentTestController()
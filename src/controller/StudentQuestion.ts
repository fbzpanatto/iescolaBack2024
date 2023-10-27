import { GenericController } from "./genericController";
import {DeepPartial, EntityTarget, ObjectLiteral, SaveOptions} from "typeorm";
import { Bimester } from "../model/Bimester";
import {AppDataSource} from "../data-source";
import {StudentQuestion} from "../model/StudentQuestion";

class StudentQuestionController extends GenericController<EntityTarget<StudentQuestion>> {

  constructor() {
    super(StudentQuestion);
  }

  async save(body: DeepPartial<ObjectLiteral>, options: SaveOptions | undefined) {

    try {
      const result = await this.repository.save(body, options);
      return { status: 201, data: result };
    } catch (error: any) {
      console.log('error', error)
      return { status: 500, message: error.message }
    }
  }
}

export const studentQuestionController = new StudentQuestionController();

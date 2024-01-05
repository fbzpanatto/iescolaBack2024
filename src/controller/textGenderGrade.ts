import { GenericController } from "./genericController";
import { EntityTarget } from "typeorm";
import { TextGenderGrade } from "../model/TextGenderGrade";

class TextGenderGradeController extends GenericController<EntityTarget<TextGenderGrade>> {

  constructor() {
    super(TextGenderGrade);
  }

  async getAll(req: any) {

    const { classroom, year, gender } = req.params

    try {

      const result = {}

      return { status: 200, data: result }

    } catch (error: any) { return { status: 500, message: error.message } }
  }
}

export const textGenderGradeController = new TextGenderGradeController();

import { GenericController } from "./genericController";
import { EntityTarget } from "typeorm";
import { QuestionGroup } from "../model/QuestionGroup";

class QuestionGroupController extends GenericController<EntityTarget<QuestionGroup>> {
  constructor() {
    super(QuestionGroup, { table: 'question_group', selectColumns: ['id', 'name', 'createdAt', 'updatedAt', 'createdByUser', 'updatedByUser'] })
  }
}

export const qGroupCtrl = new QuestionGroupController();

import { GenericController } from "./genericController";
import { EntityTarget } from "typeorm";
import { QuestionGroup } from "../model/QuestionGroup";

class QuestionGroupController extends GenericController<EntityTarget<QuestionGroup>> {
  constructor() {
    super(QuestionGroup, { table: 'question_group', selectColumns: ['id', 'name', 'createdAt', 'updatedAt', 'createdByUser', 'updatedByUser'], dateColumns: ['createdAt', 'updatedAt'] })
  }
}

export const qGroupCtrl = new QuestionGroupController();

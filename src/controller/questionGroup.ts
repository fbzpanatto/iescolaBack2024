import { GenericController } from "./genericController";
import { EntityTarget } from "typeorm";
import { QuestionGroup } from "../model/QuestionGroup";

class QuestionGroupController extends GenericController<EntityTarget<QuestionGroup>> {
  constructor() { super(QuestionGroup) }
}

export const qGroupCtrl = new QuestionGroupController();

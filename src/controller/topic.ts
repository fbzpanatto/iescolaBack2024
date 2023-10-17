import { GenericController } from "./genericController";
import { EntityTarget } from "typeorm";
import { Topic } from "../model/Topic";

class TopicController extends GenericController<EntityTarget<Topic>> {

  constructor() {
    super(Topic);
  }
}

export const topicController = new TopicController();

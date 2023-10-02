import { GenericController } from "./genericController";
import { EntityTarget } from "typeorm";
import { Disability } from "../model/Disability";

class DisabilityController extends GenericController<EntityTarget<Disability>> {

  constructor() {
    super(Disability);
  }
}

export const disabilityController = new DisabilityController();

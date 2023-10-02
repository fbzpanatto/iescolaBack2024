import { GenericController } from "./genericController";
import { EntityTarget } from "typeorm";
import { State } from "../model/State";

class StateController extends GenericController<EntityTarget<State>> {
  constructor() {
    super(State);
  }
}

export const stateController = new StateController();

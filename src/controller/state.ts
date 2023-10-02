import { GenericController } from "./genericController";
import {EntityTarget, FindManyOptions, ObjectLiteral} from "typeorm";
import { State } from "../model/State";

class StateController extends GenericController<EntityTarget<State>> {
  constructor() {
    super(State);
  }

  override async findAllWhere(options: FindManyOptions<ObjectLiteral> | undefined) {
    try {
      const condition = true

      const result = await this.repository.find(options);

      if( condition ) {
        return { status: 404, message: 'Data not found' };
      }
      return { status: 200, data: result };
    } catch (error: any) { return { status: 500, message: error.message } }
  }
}

export const stateController = new StateController();

import { GenericController } from "./genericController";
import {DeepPartial, EntityTarget, ObjectLiteral, SaveOptions} from "typeorm";
import { Discipline } from "../model/Discipline";
import {Transfer} from "../model/Transfer";

class TransferController extends GenericController<EntityTarget<Transfer>> {

  constructor() {
    super(Transfer);
  }

  override async save(body: DeepPartial<ObjectLiteral>, options: SaveOptions | undefined) {
    try {
      // const result = await this.repository.save(body, options);

      console.log(body)

      return { status: 201, data: {} };
    } catch (error: any) { return { status: 500, message: error.message } }
  }
}

export const transferController = new TransferController();

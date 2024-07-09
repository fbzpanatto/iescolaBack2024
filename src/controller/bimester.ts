import { GenericController } from "./genericController";
import { EntityTarget } from "typeorm";
import { Bimester } from "../model/Bimester";

class BimesterController extends GenericController<EntityTarget<Bimester>> {
  constructor() {
    super(Bimester);
  }
}

export const bimesterController = new BimesterController();

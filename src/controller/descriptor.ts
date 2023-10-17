import { GenericController } from "./genericController";
import { EntityTarget } from "typeorm";
import { Topic } from "../model/Topic";
import {Descriptor} from "../model/Descriptor";

class DescriptorController extends GenericController<EntityTarget<Descriptor>> {

  constructor() {
    super(Descriptor);
  }
}

export const descriptorController = new DescriptorController();

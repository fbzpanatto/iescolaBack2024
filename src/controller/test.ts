import { GenericController } from "./genericController";
import { EntityTarget } from "typeorm";
import { Bimester } from "../model/Bimester";
import {Test} from "../model/Test";

class TestController extends GenericController<EntityTarget<Test>> {

  constructor() {
    super(Test);
  }
}

export const testController = new TestController();

import { GenericController } from "./genericController";
import { EntityTarget } from "typeorm";
import { TestCategory } from "../model/TestCategory";

class TestCategoryController extends GenericController<EntityTarget<TestCategory>> {
  constructor() {
    super(TestCategory, { table: 'test_category', selectColumns: ['id', 'name', 'startClassroomNumber', 'endClassroomNumber'] })
  }
}

export const testCategoryController = new TestCategoryController();

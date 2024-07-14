import { GenericController } from "./genericController";
import { EntityTarget } from "typeorm";
import { TestCategory } from "../model/TestCategory";

class TestCategoryController extends GenericController<EntityTarget<TestCategory>> { constructor() { super(TestCategory) } }

export const testCategoryController = new TestCategoryController();

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.testCategoryController = void 0;
const genericController_1 = require("./genericController");
const TestCategory_1 = require("../model/TestCategory");
class TestCategoryController extends genericController_1.GenericController {
    constructor() {
        super(TestCategory_1.TestCategory);
    }
}
exports.testCategoryController = new TestCategoryController();

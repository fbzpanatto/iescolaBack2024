"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.classroomCategoryController = void 0;
const genericController_1 = require("./genericController");
const ClassroomCategory_1 = require("../model/ClassroomCategory");
class ClassroomCategoryController extends genericController_1.GenericController {
    constructor() {
        super(ClassroomCategory_1.ClassroomCategory);
    }
}
exports.classroomCategoryController = new ClassroomCategoryController();

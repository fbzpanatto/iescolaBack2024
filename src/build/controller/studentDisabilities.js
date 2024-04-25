"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.studentDisabilitiesController = void 0;
const genericController_1 = require("./genericController");
const StudentDisability_1 = require("../model/StudentDisability");
class StudentDisabilitiesController extends genericController_1.GenericController {
    constructor() {
        super(StudentDisability_1.StudentDisability);
    }
}
exports.studentDisabilitiesController = new StudentDisabilitiesController();

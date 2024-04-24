"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.studentClassroomController = void 0;
const genericController_1 = require("./genericController");
const StudentClassroom_1 = require("../model/StudentClassroom");
class StudentClassroomController extends genericController_1.GenericController {
    constructor() {
        super(StudentClassroom_1.StudentClassroom);
    }
}
exports.studentClassroomController = new StudentClassroomController();

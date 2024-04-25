"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.teacherClassDisciplineController = void 0;
const genericController_1 = require("./genericController");
const TeacherClassDiscipline_1 = require("../model/TeacherClassDiscipline");
class TeacherClassDisciplineController extends genericController_1.GenericController {
    constructor() {
        super(TeacherClassDiscipline_1.TeacherClassDiscipline);
    }
}
exports.teacherClassDisciplineController = new TeacherClassDisciplineController();

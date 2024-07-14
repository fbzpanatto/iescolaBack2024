"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.stuQuestCtrl = void 0;
const genericController_1 = require("./genericController");
const data_source_1 = require("../data-source");
const StudentQuestion_1 = require("../model/StudentQuestion");
const StudentTestStatus_1 = require("../model/StudentTestStatus");
class StudentQuestionController extends genericController_1.GenericController {
    constructor() { super(StudentQuestion_1.StudentQuestion); }
    updateTestStatus(id, body) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                return yield data_source_1.AppDataSource.transaction((CONN) => __awaiter(this, void 0, void 0, function* () {
                    var _a, _b;
                    const options = { relations: ['test', 'studentClassroom'], where: { id: Number(body.id), studentClassroom: { id: Number(id) }, test: { id: Number(body.test.id) } } };
                    const register = yield CONN.findOne(StudentTestStatus_1.StudentTestStatus, Object.assign({}, options));
                    if (!register) {
                        return { status: 404, message: 'Registro não encontrado' };
                    }
                    register.observation = (_a = body.observation) !== null && _a !== void 0 ? _a : register.observation;
                    register.active = (_b = body.active) !== null && _b !== void 0 ? _b : register.active;
                    yield CONN.save(StudentTestStatus_1.StudentTestStatus, register);
                    const data = {};
                    return { status: 200, data };
                }));
            }
            catch (error) {
                return { status: 500, message: error.message };
            }
        });
    }
    updateQuestion(id, body) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                return yield data_source_1.AppDataSource.transaction((CONN) => __awaiter(this, void 0, void 0, function* () {
                    const studentQuestion = yield CONN.findOne(StudentQuestion_1.StudentQuestion, { relations: ['testQuestion'], where: { id: Number(body.id) } });
                    if (!studentQuestion) {
                        return { status: 404, message: 'Registro não encontrado' };
                    }
                    const entity = { id: body.id, answer: body.answer, studentClassroom: { id: body.studentClassroom.id }, testQuestion: { id: body.testQuestion.id } };
                    const result = yield CONN.save(StudentQuestion_1.StudentQuestion, entity);
                    const mappedResult = Object.assign(Object.assign({}, result), { score: studentQuestion.testQuestion.answer.includes(result.answer.trim().toUpperCase()) ? 1 : 0 });
                    return { status: 200, data: mappedResult };
                }));
            }
            catch (error) {
                return { status: 500, message: error.message };
            }
        });
    }
}
exports.stuQuestCtrl = new StudentQuestionController();

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
exports.studentQuestionController = void 0;
const genericController_1 = require("./genericController");
const data_source_1 = require("../data-source");
const StudentQuestion_1 = require("../model/StudentQuestion");
const StudentTestStatus_1 = require("../model/StudentTestStatus");
class StudentQuestionController extends genericController_1.GenericController {
    constructor() {
        super(StudentQuestion_1.StudentQuestion);
    }
    updateTestStatus(id, body) {
        var _a, _b;
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const studentTestStatus = yield data_source_1.AppDataSource.getRepository(StudentTestStatus_1.StudentTestStatus)
                    .findOne({
                    relations: ['test', 'studentClassroom'],
                    where: {
                        id: Number(body.id),
                        studentClassroom: { id: Number(id) },
                        test: { id: Number(body.test.id) }
                    }
                });
                if (!studentTestStatus) {
                    return { status: 404, message: 'Registro não encontrado' };
                }
                studentTestStatus.observation = (_a = body.observation) !== null && _a !== void 0 ? _a : studentTestStatus.observation;
                studentTestStatus.active = (_b = body.active) !== null && _b !== void 0 ? _b : studentTestStatus.active;
                yield data_source_1.AppDataSource.getRepository(StudentTestStatus_1.StudentTestStatus).save(studentTestStatus);
                const result = {};
                return { status: 200, data: result };
            }
            catch (error) {
                return { status: 500, message: error.message };
            }
        });
    }
    updateQuestion(id, body) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const studentQuestion = yield data_source_1.AppDataSource.getRepository(StudentQuestion_1.StudentQuestion)
                    .findOne({ relations: ['testQuestion'], where: { id: Number(body.id) } });
                if (!studentQuestion) {
                    return { status: 404, message: 'Registro não encontrado' };
                }
                const result = yield data_source_1.AppDataSource
                    .getRepository(StudentQuestion_1.StudentQuestion)
                    .save({
                    id: body.id,
                    answer: body.answer,
                    studentClassroom: { id: body.studentClassroom.id },
                    testQuestion: { id: body.testQuestion.id }
                });
                const mappedResult = Object.assign(Object.assign({}, result), { score: studentQuestion.testQuestion.answer.includes(result.answer.trim().toUpperCase()) ? 1 : 0 });
                return { status: 200, data: mappedResult };
            }
            catch (error) {
                return { status: 500, message: error.message };
            }
        });
    }
}
exports.studentQuestionController = new StudentQuestionController();

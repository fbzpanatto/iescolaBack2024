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
exports.questionController = void 0;
const questionGroup_1 = require("./questionGroup");
const classroomCategory_1 = require("./classroomCategory");
const genericController_1 = require("./genericController");
const Question_1 = require("../model/Question");
const data_source_1 = require("../data-source");
const personCategories_1 = require("../utils/personCategories");
class QuestionController extends genericController_1.GenericController {
    constructor() { super(Question_1.Question); }
    isOwner(req) {
        return __awaiter(this, void 0, void 0, function* () {
            const { id: questionId } = req.params;
            try {
                const teacher = yield this.teacherByUser(req.body.user.user);
                const isAdminSupervisor = teacher.person.category.id === personCategories_1.pc.ADMN || teacher.person.category.id === personCategories_1.pc.SUPE;
                const question = yield data_source_1.AppDataSource.getRepository(Question_1.Question).findOne({ relations: ["person"], where: { id: parseInt(questionId) } });
                return { status: 200, data: { isOwner: teacher.person.id === (question === null || question === void 0 ? void 0 : question.person.id) || isAdminSupervisor } };
            }
            catch (error) {
                return { status: 500, message: error.message };
            }
        });
    }
    questionForm(req) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const classroomCategories = (yield classroomCategory_1.classroomCategoryController.findAllWhere({}, req)).data;
                const groups = (yield questionGroup_1.questionGroupController.findAllWhere({}, req)).data;
                return { status: 200, data: { classroomCategories, groups } };
            }
            catch (error) {
                return { status: 500, message: error.message };
            }
        });
    }
    findAllWhere(options, request) {
        return __awaiter(this, void 0, void 0, function* () {
            const id = request === null || request === void 0 ? void 0 : request.query.discipline;
            try {
                const questions = yield data_source_1.AppDataSource.getRepository(Question_1.Question)
                    .createQueryBuilder("question")
                    .leftJoinAndSelect("question.person", "person")
                    .leftJoinAndSelect("question.descriptor", "descriptor")
                    .leftJoinAndSelect("descriptor.topic", "topic")
                    .leftJoinAndSelect("topic.discipline", "discipline")
                    .leftJoinAndSelect("topic.classroomCategory", "classroomCategory")
                    .where("discipline.id = :disciplineId", { disciplineId: id })
                    .getMany();
                return { status: 200, data: questions };
            }
            catch (error) {
                return { status: 500, message: error.message };
            }
        });
    }
}
exports.questionController = new QuestionController();

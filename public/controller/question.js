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
exports.quesCtrl = void 0;
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
                return yield data_source_1.AppDataSource.transaction((CONN) => __awaiter(this, void 0, void 0, function* () {
                    const uTeacher = yield this.teacherByUser(req.body.user.user, CONN);
                    const masterUser = uTeacher.person.category.id === personCategories_1.pc.ADMN || uTeacher.person.category.id === personCategories_1.pc.SUPE || uTeacher.person.category.id === personCategories_1.pc.FORM;
                    const question = yield CONN.findOne(Question_1.Question, { relations: ["person"], where: { id: parseInt(questionId) } });
                    return { status: 200, data: { isOwner: uTeacher.person.id === (question === null || question === void 0 ? void 0 : question.person.id) || masterUser } };
                }));
            }
            catch (error) {
                return { status: 500, message: error.message };
            }
        });
    }
    questionForm(req) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                return yield data_source_1.AppDataSource.transaction((CONN) => __awaiter(this, void 0, void 0, function* () {
                    const classroomCategories = (yield classroomCategory_1.classCatController.findAllWhere({}, req, CONN)).data;
                    const groups = (yield questionGroup_1.qGroupCtrl.findAllWhere({}, req, CONN)).data;
                    return { status: 200, data: { classroomCategories, groups } };
                }));
            }
            catch (error) {
                return { status: 500, message: error.message };
            }
        });
    }
    allQuestions(req) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                return yield data_source_1.AppDataSource.transaction((CONN) => __awaiter(this, void 0, void 0, function* () {
                    const questions = yield CONN.getRepository(Question_1.Question)
                        .createQueryBuilder("question")
                        .leftJoinAndSelect("question.person", "person")
                        .leftJoinAndSelect("question.descriptor", "descriptor")
                        .leftJoinAndSelect("descriptor.topic", "topic")
                        .leftJoinAndSelect("topic.discipline", "discipline")
                        .leftJoinAndSelect("topic.classroomCategory", "classroomCategory")
                        .where("discipline.id = :disciplineId", { disciplineId: req.query.discipline })
                        .getMany();
                    return { status: 200, data: questions };
                }));
            }
            catch (error) {
                return { status: 500, message: error.message };
            }
        });
    }
}
exports.quesCtrl = new QuestionController();

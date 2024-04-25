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
const genericController_1 = require("./genericController");
const Question_1 = require("../model/Question");
const data_source_1 = require("../data-source");
class QuestionController extends genericController_1.GenericController {
    constructor() {
        super(Question_1.Question);
    }
    findAllWhere(options, request) {
        return __awaiter(this, void 0, void 0, function* () {
            const id = request === null || request === void 0 ? void 0 : request.query.discipline;
            try {
                const questions = yield data_source_1.AppDataSource.getRepository(Question_1.Question)
                    .createQueryBuilder('question')
                    .leftJoinAndSelect('question.descriptor', 'descriptor')
                    .leftJoinAndSelect('descriptor.topic', 'topic')
                    .leftJoinAndSelect('topic.discipline', 'discipline')
                    .leftJoinAndSelect('topic.classroomCategory', 'classroomCategory')
                    .where('discipline.id = :disciplineId', { disciplineId: id })
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

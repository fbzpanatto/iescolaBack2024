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
exports.topicController = void 0;
const genericController_1 = require("./genericController");
const Topic_1 = require("../model/Topic");
const data_source_1 = require("../data-source");
class TopicController extends genericController_1.GenericController {
    constructor() { super(Topic_1.Topic); }
    findAllWhere(options, request) {
        return __awaiter(this, void 0, void 0, function* () {
            const classCategoryId = request === null || request === void 0 ? void 0 : request.query.category;
            const disciplineId = request === null || request === void 0 ? void 0 : request.query.discipline;
            try {
                const result = yield data_source_1.AppDataSource.getRepository(Topic_1.Topic).find({
                    relations: ['classroomCategory'],
                    where: {
                        classroomCategory: { id: Number(classCategoryId) },
                        discipline: { id: Number(disciplineId) }
                    }
                });
                return { status: 200, data: result };
            }
            catch (error) {
                return { status: 500, message: error.message };
            }
        });
    }
}
exports.topicController = new TopicController();

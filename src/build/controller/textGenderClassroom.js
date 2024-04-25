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
exports.textGenderClassroomController = void 0;
const genericController_1 = require("./genericController");
const TextGenderClassroom_1 = require("../model/TextGenderClassroom");
const data_source_1 = require("../data-source");
const Classroom_1 = require("../model/Classroom");
class TextGenderClassroomController extends genericController_1.GenericController {
    constructor() {
        super(TextGenderClassroom_1.TextGenderClassroom);
    }
    getTabs(req) {
        return __awaiter(this, void 0, void 0, function* () {
            const { id: classroomId } = req.params;
            try {
                const classroom = yield data_source_1.AppDataSource
                    .getRepository(Classroom_1.Classroom)
                    .findOne({ select: ['shortName'], where: { id: Number(classroomId) } });
                if (!classroom)
                    return { status: 404, message: 'Sala não encontrada' };
                const notDigit = /\D/g;
                const classroomNumber = classroom.shortName.replace(notDigit, '');
                const textGenderTabs = yield data_source_1.AppDataSource
                    .getRepository(TextGenderClassroom_1.TextGenderClassroom)
                    .createQueryBuilder('textGenderClassroom')
                    .leftJoinAndSelect('textGenderClassroom.textGender', 'textGender')
                    .where('classroomNumber = :classroomNumber', { classroomNumber })
                    .getMany();
                let totalTab = {
                    id: 99,
                    classroomNumber: 99,
                    textGender: { id: 99, name: "COMPARATIVO" },
                    notInclude: true
                };
                return { status: 200, data: [...textGenderTabs, totalTab] };
            }
            catch (error) {
                return { status: 500, message: error.message };
            }
        });
    }
    getTabsReport(req) {
        return __awaiter(this, void 0, void 0, function* () {
            const { classroomNumber, year } = req.params;
            try {
                const textGenderTabs = yield data_source_1.AppDataSource
                    .getRepository(TextGenderClassroom_1.TextGenderClassroom)
                    .createQueryBuilder('textGenderClassroom')
                    .leftJoinAndSelect('textGenderClassroom.textGender', 'textGender')
                    .where('classroomNumber = :classroomNumber', { classroomNumber })
                    .getMany();
                if (!textGenderTabs)
                    return { status: 404, message: 'Gêneros Textuais não foram encontrados' };
                return { status: 200, data: textGenderTabs };
            }
            catch (error) {
                return { status: 500, message: error.message };
            }
        });
    }
}
exports.textGenderClassroomController = new TextGenderClassroomController();

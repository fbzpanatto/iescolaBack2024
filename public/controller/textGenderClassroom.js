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
    constructor() { super(TextGenderClassroom_1.TextGenderClassroom); }
    getTabs(req) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                return yield data_source_1.AppDataSource.transaction((CONN) => __awaiter(this, void 0, void 0, function* () {
                    const classroom = yield CONN.findOne(Classroom_1.Classroom, { select: ['shortName'], where: { id: Number(req.params.id) } });
                    if (!classroom)
                        return { status: 404, message: 'Sala não encontrada.' };
                    const tabs = yield CONN.getRepository(TextGenderClassroom_1.TextGenderClassroom)
                        .createQueryBuilder('textGenderClassroom')
                        .leftJoinAndSelect('textGenderClassroom.textGender', 'textGender')
                        .where('classroomNumber = :classroomNumber', { classroomNumber: classroom.shortName.replace(/\D/g, '') })
                        .getMany();
                    let totalTab = { id: 99, classroomNumber: 99, textGender: { id: 99, name: "COMPARATIVO" }, notInclude: true };
                    return { status: 200, data: [...tabs, totalTab] };
                }));
            }
            catch (error) {
                return { status: 500, message: error.message };
            }
        });
    }
    getTabsReport(req) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                return yield data_source_1.AppDataSource.transaction((CONN) => __awaiter(this, void 0, void 0, function* () {
                    const textGenderTabs = yield CONN.getRepository(TextGenderClassroom_1.TextGenderClassroom)
                        .createQueryBuilder('textGenderClassroom')
                        .leftJoinAndSelect('textGenderClassroom.textGender', 'textGender')
                        .where('classroomNumber = :classroomNumber', { classroomNumber: req.params.classroomNumber })
                        .getMany();
                    if (!textGenderTabs)
                        return { status: 404, message: 'Gêneros Textuais não foram encontrados' };
                    return { status: 200, data: textGenderTabs };
                }));
            }
            catch (error) {
                return { status: 500, message: error.message };
            }
        });
    }
}
exports.textGenderClassroomController = new TextGenderClassroomController();

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
exports.discController = void 0;
const genericController_1 = require("./genericController");
const typeorm_1 = require("typeorm");
const Discipline_1 = require("../model/Discipline");
const personCategories_1 = require("../utils/personCategories");
const data_source_1 = require("../data-source");
class DisciplineController extends genericController_1.GenericController {
    constructor() { super(Discipline_1.Discipline); }
    getAllDisciplines(request, CONN) {
        return __awaiter(this, void 0, void 0, function* () {
            const body = request === null || request === void 0 ? void 0 : request.body;
            try {
                if (!CONN) {
                    const teacher = yield this.teacherByUser(body.user.user);
                    const teacherDisciplines = yield this.teacherDisciplines(request === null || request === void 0 ? void 0 : request.body.user);
                    let result = yield this.repository
                        .createQueryBuilder("discipline")
                        .select(["discipline.id as id", "discipline.name as name", "discipline.shortName as shortName"])
                        .where(new typeorm_1.Brackets((qb) => {
                        if (!(teacher.person.category.id === personCategories_1.pc.PROF)) {
                            qb.where("discipline.id > 0");
                            return;
                        }
                        qb.where("discipline.id IN (:...ids)", { ids: teacherDisciplines.disciplines });
                    }))
                        .getRawMany();
                    return { status: 200, data: result };
                }
                let result;
                yield data_source_1.AppDataSource.transaction((CONN) => __awaiter(this, void 0, void 0, function* () {
                    const teacher = yield this.teacherByUser(body.user.user, CONN);
                    const teacherDisciplines = yield this.teacherDisciplines(request === null || request === void 0 ? void 0 : request.body.user, CONN);
                    result = yield CONN.getRepository(Discipline_1.Discipline)
                        .createQueryBuilder("discipline")
                        .select(["discipline.id as id", "discipline.name as name", "discipline.shortName as shortName"])
                        .where(new typeorm_1.Brackets((qb) => {
                        if (!(teacher.person.category.id === personCategories_1.pc.PROF)) {
                            qb.where("discipline.id > 0");
                            return;
                        }
                        qb.where("discipline.id IN (:...ids)", { ids: teacherDisciplines.disciplines });
                    }))
                        .getRawMany();
                }));
                return { status: 200, data: result };
            }
            catch (error) {
                return { status: 500, message: error.message };
            }
        });
    }
}
exports.discController = new DisciplineController();

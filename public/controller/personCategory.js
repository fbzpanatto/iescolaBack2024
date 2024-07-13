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
exports.personCategoryController = void 0;
const genericController_1 = require("./genericController");
const PersonCategory_1 = require("../model/PersonCategory");
const data_source_1 = require("../data-source");
const personCategories_1 = require("../utils/personCategories");
class PersonCategoryController extends genericController_1.GenericController {
    constructor() {
        super(PersonCategory_1.PersonCategory);
    }
    findAllWhere(options, request, transaction) {
        return __awaiter(this, void 0, void 0, function* () {
            let excludeIds = [personCategories_1.pc.ALUN];
            const userBody = request === null || request === void 0 ? void 0 : request.body.user;
            try {
                if (!transaction) {
                    const userTeacherFromFront = yield this.teacherByUser(userBody.user);
                    if (!userTeacherFromFront) {
                        return { status: 404, message: "Usuário não encontrado" };
                    }
                    if (userTeacherFromFront.person.category.id != userBody.category) {
                        return { status: 403, message: "Usuário não autorizado" };
                    }
                    const result = yield data_source_1.AppDataSource.getRepository(PersonCategory_1.PersonCategory)
                        .createQueryBuilder("personCategory")
                        .where("personCategory.id NOT IN (:...ids)", { ids: excludeIds })
                        .getMany();
                    return { status: 200, data: result };
                }
                const userTeacherFromFront = yield this.teacherByUser(userBody.user, transaction);
                if (!userTeacherFromFront) {
                    return { status: 404, message: "Usuário não encontrado" };
                }
                if (userTeacherFromFront.person.category.id != userBody.category) {
                    return { status: 403, message: "Usuário não autorizado" };
                }
                if (userTeacherFromFront.person.category.id === personCategories_1.pc.SUPE) {
                    excludeIds = [...excludeIds, personCategories_1.pc.ADMN];
                }
                if (userTeacherFromFront.person.category.id === personCategories_1.pc.DIRE) {
                    excludeIds = [...excludeIds, personCategories_1.pc.ADMN, personCategories_1.pc.SUPE, personCategories_1.pc.DIRE];
                }
                if (userTeacherFromFront.person.category.id === personCategories_1.pc.VICE) {
                    excludeIds = [...excludeIds, personCategories_1.pc.ADMN, personCategories_1.pc.SUPE, personCategories_1.pc.DIRE, personCategories_1.pc.VICE];
                }
                if (userTeacherFromFront.person.category.id === personCategories_1.pc.COOR) {
                    excludeIds = [...excludeIds, personCategories_1.pc.ADMN, personCategories_1.pc.SUPE, personCategories_1.pc.DIRE, personCategories_1.pc.VICE];
                }
                if (userTeacherFromFront.person.category.id === personCategories_1.pc.SECR) {
                    excludeIds = [...excludeIds, personCategories_1.pc.ADMN, personCategories_1.pc.SUPE, personCategories_1.pc.DIRE, personCategories_1.pc.VICE, personCategories_1.pc.COOR];
                }
                if (userTeacherFromFront.person.category.id === personCategories_1.pc.MONI) {
                    excludeIds = [...excludeIds, personCategories_1.pc.ADMN, personCategories_1.pc.SUPE, personCategories_1.pc.DIRE, personCategories_1.pc.VICE, personCategories_1.pc.COOR, personCategories_1.pc.SECR, personCategories_1.pc.MONI];
                }
                if (userTeacherFromFront.person.category.id === personCategories_1.pc.PROF) {
                    excludeIds = [...excludeIds, personCategories_1.pc.ADMN, personCategories_1.pc.SUPE, personCategories_1.pc.DIRE, personCategories_1.pc.VICE, personCategories_1.pc.COOR, personCategories_1.pc.SECR, personCategories_1.pc.MONI];
                }
                const result = yield transaction.getRepository(PersonCategory_1.PersonCategory)
                    .createQueryBuilder("personCategory")
                    .where("personCategory.id NOT IN (:...ids)", { ids: excludeIds })
                    .getMany();
                return { status: 200, data: result };
            }
            catch (error) {
                return { status: 500, message: error.message };
            }
        });
    }
}
exports.personCategoryController = new PersonCategoryController();

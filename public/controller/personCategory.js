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
exports.pCatCtrl = void 0;
const genericController_1 = require("./genericController");
const PersonCategory_1 = require("../model/PersonCategory");
const personCategories_1 = require("../utils/personCategories");
const data_source_1 = require("../data-source");
class PersonCategoryController extends genericController_1.GenericController {
    constructor() { super(PersonCategory_1.PersonCategory); }
    findAllPerCat(request, CONN) {
        return __awaiter(this, void 0, void 0, function* () {
            let excludeIds = [personCategories_1.pc.ALUN];
            const userBody = request === null || request === void 0 ? void 0 : request.body.user;
            try {
                if (!CONN) {
                    const uTeacher = yield this.teacherByUser(userBody.user);
                    if (!uTeacher) {
                        return { status: 404, message: "Usuário não encontrado" };
                    }
                    if (uTeacher.person.category.id != userBody.category) {
                        return { status: 403, message: "Usuário não autorizado" };
                    }
                    if (uTeacher.person.category.id === personCategories_1.pc.SUPE) {
                        excludeIds = [...excludeIds, personCategories_1.pc.ADMN];
                    }
                    if (uTeacher.person.category.id === personCategories_1.pc.FORM) {
                        excludeIds = [...excludeIds, personCategories_1.pc.ADMN, personCategories_1.pc.SUPE];
                    }
                    if (uTeacher.person.category.id === personCategories_1.pc.DIRE) {
                        excludeIds = [...excludeIds, personCategories_1.pc.ADMN, personCategories_1.pc.SUPE, personCategories_1.pc.FORM];
                    }
                    if (uTeacher.person.category.id === personCategories_1.pc.VICE) {
                        excludeIds = [...excludeIds, personCategories_1.pc.ADMN, personCategories_1.pc.SUPE, personCategories_1.pc.FORM, personCategories_1.pc.DIRE];
                    }
                    if (uTeacher.person.category.id === personCategories_1.pc.COOR) {
                        excludeIds = [...excludeIds, personCategories_1.pc.ADMN, personCategories_1.pc.SUPE, personCategories_1.pc.FORM, personCategories_1.pc.DIRE, personCategories_1.pc.VICE];
                    }
                    if (uTeacher.person.category.id === personCategories_1.pc.SECR) {
                        excludeIds = [...excludeIds, personCategories_1.pc.ADMN, personCategories_1.pc.SUPE, personCategories_1.pc.FORM, personCategories_1.pc.DIRE, personCategories_1.pc.VICE, personCategories_1.pc.COOR];
                    }
                    if (uTeacher.person.category.id === personCategories_1.pc.MONI) {
                        excludeIds = [...excludeIds, personCategories_1.pc.ADMN, personCategories_1.pc.SUPE, personCategories_1.pc.FORM, personCategories_1.pc.DIRE, personCategories_1.pc.VICE, personCategories_1.pc.COOR, personCategories_1.pc.SECR, personCategories_1.pc.PROF];
                    }
                    if (uTeacher.person.category.id === personCategories_1.pc.PROF) {
                        excludeIds = [...excludeIds, personCategories_1.pc.ADMN, personCategories_1.pc.SUPE, personCategories_1.pc.FORM, personCategories_1.pc.DIRE, personCategories_1.pc.VICE, personCategories_1.pc.COOR, personCategories_1.pc.SECR, personCategories_1.pc.MONI];
                    }
                    const result = yield data_source_1.AppDataSource.getRepository(PersonCategory_1.PersonCategory).createQueryBuilder("personCategory").where("personCategory.id NOT IN (:...ids)", { ids: excludeIds }).getMany();
                    return { status: 200, data: result };
                }
                const uTeacher = yield this.teacherByUser(userBody.user, CONN);
                if (!uTeacher) {
                    return { status: 404, message: "Usuário não encontrado" };
                }
                if (uTeacher.person.category.id != userBody.category) {
                    return { status: 403, message: "Usuário não autorizado" };
                }
                if (uTeacher.person.category.id === personCategories_1.pc.SUPE) {
                    excludeIds = [...excludeIds, personCategories_1.pc.ADMN];
                }
                if (uTeacher.person.category.id === personCategories_1.pc.FORM) {
                    excludeIds = [...excludeIds, personCategories_1.pc.ADMN, personCategories_1.pc.SUPE];
                }
                if (uTeacher.person.category.id === personCategories_1.pc.DIRE) {
                    excludeIds = [...excludeIds, personCategories_1.pc.ADMN, personCategories_1.pc.SUPE, personCategories_1.pc.FORM];
                }
                if (uTeacher.person.category.id === personCategories_1.pc.VICE) {
                    excludeIds = [...excludeIds, personCategories_1.pc.ADMN, personCategories_1.pc.SUPE, personCategories_1.pc.FORM, personCategories_1.pc.DIRE];
                }
                if (uTeacher.person.category.id === personCategories_1.pc.COOR) {
                    excludeIds = [...excludeIds, personCategories_1.pc.ADMN, personCategories_1.pc.SUPE, personCategories_1.pc.FORM, personCategories_1.pc.DIRE, personCategories_1.pc.VICE];
                }
                if (uTeacher.person.category.id === personCategories_1.pc.SECR) {
                    excludeIds = [...excludeIds, personCategories_1.pc.ADMN, personCategories_1.pc.SUPE, personCategories_1.pc.FORM, personCategories_1.pc.DIRE, personCategories_1.pc.VICE, personCategories_1.pc.COOR];
                }
                if (uTeacher.person.category.id === personCategories_1.pc.MONI) {
                    excludeIds = [...excludeIds, personCategories_1.pc.ADMN, personCategories_1.pc.SUPE, personCategories_1.pc.FORM, personCategories_1.pc.DIRE, personCategories_1.pc.VICE, personCategories_1.pc.COOR, personCategories_1.pc.SECR, personCategories_1.pc.PROF];
                }
                if (uTeacher.person.category.id === personCategories_1.pc.PROF) {
                    excludeIds = [...excludeIds, personCategories_1.pc.ADMN, personCategories_1.pc.SUPE, personCategories_1.pc.FORM, personCategories_1.pc.DIRE, personCategories_1.pc.VICE, personCategories_1.pc.COOR, personCategories_1.pc.SECR, personCategories_1.pc.MONI];
                }
                const result = yield (CONN === null || CONN === void 0 ? void 0 : CONN.getRepository(PersonCategory_1.PersonCategory).createQueryBuilder("personCategory").where("personCategory.id NOT IN (:...ids)", { ids: excludeIds }).getMany());
                return { status: 200, data: result };
            }
            catch (error) {
                return { status: 500, message: error.message };
            }
        });
    }
}
exports.pCatCtrl = new PersonCategoryController();

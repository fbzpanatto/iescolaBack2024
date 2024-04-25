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
    findAllWhere(options, request) {
        return __awaiter(this, void 0, void 0, function* () {
            let excludeIds = [personCategories_1.personCategories.ALUNO];
            const userBody = request === null || request === void 0 ? void 0 : request.body.user;
            try {
                const userTeacher = yield this.teacherByUser(userBody.user);
                if (!userTeacher)
                    return { status: 404, message: 'Usuário não encontrado' };
                if (userTeacher.person.category.id != userBody.category)
                    return { status: 403, message: 'Usuário não autorizado' };
                const result = yield data_source_1.AppDataSource.getRepository(PersonCategory_1.PersonCategory)
                    .createQueryBuilder('personCategory')
                    .where('personCategory.id NOT IN (:...ids)', { ids: excludeIds })
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

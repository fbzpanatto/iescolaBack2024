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
exports.classroomController = void 0;
const genericController_1 = require("./genericController");
const typeorm_1 = require("typeorm");
const Classroom_1 = require("../model/Classroom");
const personCategories_1 = require("../utils/personCategories");
class ClassroomController extends genericController_1.GenericController {
    constructor() {
        super(Classroom_1.Classroom);
    }
    findAllWhere(options, request) {
        return __awaiter(this, void 0, void 0, function* () {
            const { body } = request;
            try {
                const teacher = yield this.teacherByUser(body.user.user);
                const teacherClasses = yield this.teacherClassrooms(request === null || request === void 0 ? void 0 : request.body.user);
                const isAdminSupervisor = teacher.person.category.id === personCategories_1.personCategories.ADMINISTRADOR || teacher.person.category.id === personCategories_1.personCategories.SUPERVISOR;
                let result = yield this.repository
                    .createQueryBuilder('classroom')
                    .select('classroom.id', 'id')
                    .addSelect('classroom.shortName', 'name')
                    .addSelect('school.shortName', 'school')
                    .leftJoin('classroom.school', 'school')
                    .where(new typeorm_1.Brackets(qb => {
                    if (!isAdminSupervisor) {
                        qb.where('classroom.id IN (:...ids)', { ids: teacherClasses.classrooms });
                    }
                    else {
                        qb.where('classroom.id > 0');
                    }
                }))
                    .getRawMany();
                return { status: 200, data: result };
            }
            catch (error) {
                return { status: 500, message: error.message };
            }
        });
    }
}
exports.classroomController = new ClassroomController();

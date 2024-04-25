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
exports.literacySecondController = void 0;
const genericController_1 = require("./genericController");
const typeorm_1 = require("typeorm");
const TextGenderGrade_1 = require("../model/TextGenderGrade");
const data_source_1 = require("../data-source");
const Classroom_1 = require("../model/Classroom");
const personCategories_1 = require("../utils/personCategories");
const classroomCategory_1 = require("../utils/classroomCategory");
class LiteracySecondController extends genericController_1.GenericController {
    constructor() { super(TextGenderGrade_1.TextGenderGrade); }
    getClassrooms(req) {
        return __awaiter(this, void 0, void 0, function* () {
            const search = req.query.search;
            const yearName = req.params.year;
            const userBody = req.body.user;
            try {
                const teacherClasses = yield this.teacherClassrooms(req.body.user);
                const preResult = yield data_source_1.AppDataSource.getRepository(Classroom_1.Classroom)
                    .createQueryBuilder('classroom')
                    .leftJoinAndSelect('classroom.school', 'school')
                    .leftJoinAndSelect('classroom.category', 'category')
                    .leftJoinAndSelect('classroom.studentClassrooms', 'studentClassroom')
                    .leftJoinAndSelect('studentClassroom.year', 'year')
                    .leftJoin('studentClassroom.textGenderGrades', 'textGenderGrades')
                    .where(new typeorm_1.Brackets(qb => {
                    if (userBody.category != personCategories_1.personCategories.ADMINISTRADOR && userBody.category != personCategories_1.personCategories.SUPERVISOR) {
                        qb.where("classroom.id IN (:...teacherClasses)", { teacherClasses: teacherClasses.classrooms });
                    }
                }))
                    .andWhere('category.id = :categoryId', { categoryId: classroomCategory_1.classroomCategory.PEB_I })
                    .andWhere('textGenderGrades.id IS NOT NULL')
                    .andWhere('classroom.active = :active', { active: true })
                    .andWhere('year.name = :yearName', { yearName })
                    .andWhere(new typeorm_1.Brackets(qb => {
                    if (search) {
                        qb.where("school.name LIKE :search", { search: `%${search}%` })
                            .orWhere("school.shortName LIKE :search", { search: `%${search}%` });
                    }
                }))
                    .orderBy('school.name', 'ASC')
                    .getMany();
                return { status: 200, data: preResult };
            }
            catch (error) {
                return { status: 500, message: error.message };
            }
        });
    }
}
exports.literacySecondController = new LiteracySecondController();

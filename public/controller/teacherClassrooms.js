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
exports.teacherClassroomsController = void 0;
const genericController_1 = require("./genericController");
const typeorm_1 = require("typeorm");
const Classroom_1 = require("../model/Classroom");
const data_source_1 = require("../data-source");
const TeacherClassDiscipline_1 = require("../model/TeacherClassDiscipline");
const personCategories_1 = require("../utils/personCategories");
class TeacherClassroomsController extends genericController_1.GenericController {
    constructor() { super(Classroom_1.Classroom); }
    getAllTClass(request, CONN) {
        return __awaiter(this, void 0, void 0, function* () {
            const body = request === null || request === void 0 ? void 0 : request.body;
            try {
                const teacher = yield this.teacherByUser(body.user.user);
                const masterUser = teacher.person.category.id === personCategories_1.pc.ADMN || teacher.person.category.id === personCategories_1.pc.SUPE;
                const fields = ['classroom.id as id', 'classroom.shortName as name', 'school.shortName as school'];
                if (!CONN) {
                    if (masterUser) {
                        const classrooms = yield data_source_1.AppDataSource.getRepository(Classroom_1.Classroom)
                            .createQueryBuilder('classroom')
                            .select(fields)
                            .leftJoin('classroom.school', 'school')
                            .groupBy('classroom.id')
                            .getRawMany();
                        return { status: 200, data: classrooms };
                    }
                    else {
                        const classrooms = yield data_source_1.AppDataSource.getRepository(TeacherClassDiscipline_1.TeacherClassDiscipline)
                            .createQueryBuilder('teacherClassDiscipline')
                            .select(fields)
                            .leftJoin('teacherClassDiscipline.classroom', 'classroom')
                            .leftJoin('classroom.school', 'school')
                            .leftJoin('teacherClassDiscipline.teacher', 'teacher')
                            .where('teacher.id = :id', { id: teacher.id })
                            .andWhere(new typeorm_1.Brackets(qb => { if (!masterUser) {
                            qb.andWhere('teacherClassDiscipline.endedAt IS NULL');
                        } }))
                            .groupBy('classroom.id')
                            .getRawMany();
                        return { status: 200, data: classrooms };
                    }
                }
                if (masterUser) {
                    const classrooms = yield CONN.getRepository(Classroom_1.Classroom)
                        .createQueryBuilder('classroom')
                        .select(fields)
                        .leftJoin('classroom.school', 'school')
                        .groupBy('classroom.id')
                        .getRawMany();
                    return { status: 200, data: classrooms };
                }
                else {
                    const classrooms = yield CONN.getRepository(TeacherClassDiscipline_1.TeacherClassDiscipline)
                        .createQueryBuilder('teacherClassDiscipline')
                        .select(fields)
                        .leftJoin('teacherClassDiscipline.classroom', 'classroom')
                        .leftJoin('classroom.school', 'school')
                        .leftJoin('teacherClassDiscipline.teacher', 'teacher')
                        .where('teacher.id = :id', { id: teacher.id })
                        .andWhere(new typeorm_1.Brackets(qb => { if (!masterUser) {
                        qb.andWhere('teacherClassDiscipline.endedAt IS NULL');
                    } }))
                        .groupBy('classroom.id')
                        .getRawMany();
                    return { status: 200, data: classrooms };
                }
            }
            catch (error) {
                return { status: 500, message: error.message };
            }
        });
    }
    save(body) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                return yield data_source_1.AppDataSource.transaction((CONN) => __awaiter(this, void 0, void 0, function* () {
                    const classrooms = yield CONN.getRepository(Classroom_1.Classroom)
                        .createQueryBuilder('classroom')
                        .select('classroom.id', 'id')
                        .addSelect('classroom.shortName', 'name')
                        .addSelect('school.shortName', 'school')
                        .leftJoin('classroom.school', 'school')
                        .where('classroom.id IN (:...ids)', { ids: body.classrooms })
                        .getRawMany();
                    return { status: 200, data: classrooms };
                }));
            }
            catch (error) {
                return { status: 500, message: error.message };
            }
        });
    }
}
exports.teacherClassroomsController = new TeacherClassroomsController();

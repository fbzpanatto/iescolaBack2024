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
exports.literacyController = void 0;
const genericController_1 = require("./genericController");
const typeorm_1 = require("typeorm");
const Literacy_1 = require("../model/Literacy");
const data_source_1 = require("../data-source");
const personCategories_1 = require("../utils/personCategories");
const Classroom_1 = require("../model/Classroom");
const classroomCategory_1 = require("../utils/classroomCategory");
const StudentClassroom_1 = require("../model/StudentClassroom");
const LiteracyLevel_1 = require("../model/LiteracyLevel");
const LiteracyTier_1 = require("../model/LiteracyTier");
const Year_1 = require("../model/Year");
const LiteracyFirst_1 = require("../model/LiteracyFirst");
class LiteracyController extends genericController_1.GenericController {
    constructor() { super(Literacy_1.Literacy); }
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
                    .leftJoin('studentClassroom.literacies', 'literacies')
                    .where(new typeorm_1.Brackets(qb => {
                    if (userBody.category != personCategories_1.personCategories.ADMINISTRADOR && userBody.category != personCategories_1.personCategories.SUPERVISOR) {
                        qb.where("classroom.id IN (:...teacherClasses)", { teacherClasses: teacherClasses.classrooms });
                    }
                }))
                    .andWhere('category.id = :categoryId', { categoryId: classroomCategory_1.classroomCategory.PEB_I })
                    .andWhere('literacies.id IS NOT NULL')
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
    getStudentClassrooms(request) {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            const yearName = request === null || request === void 0 ? void 0 : request.params.year;
            const userBody = request === null || request === void 0 ? void 0 : request.body.user;
            const classroomId = request === null || request === void 0 ? void 0 : request.params.id;
            try {
                const teacherClasses = yield this.teacherClassrooms(request === null || request === void 0 ? void 0 : request.body.user);
                const literacyLevels = yield data_source_1.AppDataSource.getRepository(LiteracyLevel_1.LiteracyLevel).find();
                const literacyTiers = yield data_source_1.AppDataSource.getRepository(LiteracyTier_1.LiteracyTier).find();
                const classroom = yield data_source_1.AppDataSource.getRepository(Classroom_1.Classroom).findOne({ where: { id: Number(classroomId) } });
                const studentClassrooms = yield this.getStudentClassroomsWithLiteracy(classroom, userBody, teacherClasses, yearName);
                const resultArray = [];
                for (let tier of literacyTiers) {
                    let totalPerTier = 0;
                    let localTier = {
                        id: tier.id,
                        name: tier.name,
                        total: totalPerTier,
                        levels: []
                    };
                    resultArray.push(localTier);
                    for (let level of literacyLevels) {
                        let totalPerLevel = 0;
                        const auxLocalTier = resultArray.find(el => el.id === tier.id);
                        auxLocalTier === null || auxLocalTier === void 0 ? void 0 : auxLocalTier.levels.push({ id: level.id, name: level.name, total: totalPerLevel, rate: 0 });
                        const auxLocalLevel = auxLocalTier === null || auxLocalTier === void 0 ? void 0 : auxLocalTier.levels.find(el => el.id === level.id);
                        for (let st of studentClassrooms) {
                            for (let el of st.literacies) {
                                if (((_a = el.literacyLevel) === null || _a === void 0 ? void 0 : _a.id) && tier.id === el.literacyTier.id && level.id === el.literacyLevel.id && el.toRate) {
                                    totalPerLevel += 1;
                                    totalPerTier += 1;
                                    auxLocalLevel.total = totalPerLevel;
                                    auxLocalTier.total = totalPerTier;
                                }
                            }
                        }
                    }
                }
                for (let tier of resultArray) {
                    for (let level of tier.levels) {
                        level.rate = Math.round((level.total / tier.total) * 100);
                    }
                }
                return { status: 200, data: { literacyTiers, literacyLevels, studentClassrooms, resultArray } };
            }
            catch (error) {
                return { status: 500, message: error.message };
            }
        });
    }
    getStudentClassroomsWithLiteracy(classroom, userBody, teacherClasses, yearName) {
        return __awaiter(this, void 0, void 0, function* () {
            const classroomNumber = classroom.shortName.replace(/\D/g, '');
            const lastYear = yield data_source_1.AppDataSource.getRepository(Year_1.Year).findOne({ where: { name: String(Number(yearName) - 1) } });
            let studentClassrooms = [];
            studentClassrooms = yield data_source_1.AppDataSource.getRepository(StudentClassroom_1.StudentClassroom)
                .createQueryBuilder('studentClassroom')
                .leftJoinAndSelect('studentClassroom.year', 'year')
                .leftJoinAndSelect('studentClassroom.student', 'student')
                .leftJoinAndSelect('student.person', 'person')
                .leftJoinAndSelect('studentClassroom.literacies', 'literacies')
                .leftJoinAndSelect('literacies.literacyLevel', 'literacyLevel')
                .leftJoinAndSelect('literacies.literacyTier', 'literacyTier')
                .leftJoinAndSelect('studentClassroom.classroom', 'classroom')
                .leftJoinAndSelect('classroom.school', 'school')
                .where(new typeorm_1.Brackets(qb => {
                if (userBody.category != personCategories_1.personCategories.ADMINISTRADOR && userBody.category != personCategories_1.personCategories.SUPERVISOR) {
                    qb.where("classroom.id IN (:...teacherClasses)", { teacherClasses: teacherClasses.classrooms });
                }
            }))
                .andWhere('classroom.id = :classroomId', { classroomId: classroom.id })
                .andWhere('literacies.id IS NOT NULL')
                .andWhere("year.name = :yearName", { yearName })
                .orderBy('studentClassroom.rosterNumber', 'ASC')
                .getMany();
            if (!lastYear || Number(classroomNumber) === 1) {
                const result = studentClassrooms.map((studentClassroom) => __awaiter(this, void 0, void 0, function* () {
                    var _a;
                    const literacyFirsts = yield data_source_1.AppDataSource.getRepository(LiteracyFirst_1.LiteracyFirst).findOne({
                        where: { student: { id: studentClassroom.student.id } },
                        relations: ['literacyLevel']
                    });
                    return Object.assign(Object.assign({}, studentClassroom), { literacyFirsts: { id: literacyFirsts === null || literacyFirsts === void 0 ? void 0 : literacyFirsts.id, literacyLevel: (_a = literacyFirsts === null || literacyFirsts === void 0 ? void 0 : literacyFirsts.literacyLevel) !== null && _a !== void 0 ? _a : { id: 'NA', name: 'NA', shortName: 'NA' } } });
                }));
                return yield Promise.all(result);
            }
            const result = studentClassrooms.map((studentClassroom) => __awaiter(this, void 0, void 0, function* () {
                var _b, _c;
                const studentId = studentClassroom.student.id;
                const lastLiteracy = yield data_source_1.AppDataSource.getRepository(Literacy_1.Literacy)
                    .createQueryBuilder('literacy')
                    .innerJoin('literacy.studentClassroom', 'studentClassroom')
                    .innerJoin('studentClassroom.year', 'year')
                    .innerJoin('studentClassroom.student', 'student')
                    .innerJoin('literacy.literacyTier', 'literacyTier')
                    .leftJoinAndSelect('literacy.literacyLevel', 'literacyLevel')
                    .where('student.id = :studentId', { studentId })
                    .andWhere('literacyLevel.id IS NOT NULL') // Garante que o literacyLevel não seja nulo
                    .andWhere('year.name = :yearName', { yearName: lastYear === null || lastYear === void 0 ? void 0 : lastYear.name })
                    .orderBy('literacyTier.id', 'DESC') // Ordena por ordem decrescente de ID do literacyTier
                    .addOrderBy('literacy.id', 'DESC') // Em caso de empate no ID do literacyTier, usa o ID do literacy
                    .getOne();
                if (!(lastLiteracy === null || lastLiteracy === void 0 ? void 0 : lastLiteracy.literacyLevel)) {
                    const literacyFirsts = yield data_source_1.AppDataSource.getRepository(LiteracyFirst_1.LiteracyFirst).findOne({
                        where: { student: { id: studentClassroom.student.id } },
                        relations: ['literacyLevel']
                    });
                    return Object.assign(Object.assign({}, studentClassroom), { literacyFirsts: { id: literacyFirsts === null || literacyFirsts === void 0 ? void 0 : literacyFirsts.id, literacyLevel: (_b = literacyFirsts === null || literacyFirsts === void 0 ? void 0 : literacyFirsts.literacyLevel) !== null && _b !== void 0 ? _b : { id: 'NA', name: 'NA', shortName: 'NA' } } });
                }
                return Object.assign(Object.assign({}, studentClassroom), { literacyFirsts: { id: lastLiteracy === null || lastLiteracy === void 0 ? void 0 : lastLiteracy.id, literacyLevel: (_c = lastLiteracy === null || lastLiteracy === void 0 ? void 0 : lastLiteracy.literacyLevel) !== null && _c !== void 0 ? _c : { id: 'NA', name: 'NA', shortName: 'NA' } } });
            }));
            return yield Promise.all(result);
        });
    }
    getTotals(request) {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            const yearName = request === null || request === void 0 ? void 0 : request.params.year;
            const userBody = request === null || request === void 0 ? void 0 : request.body.user;
            const classroomId = request === null || request === void 0 ? void 0 : request.params.id;
            try {
                const teacher = yield this.teacherByUser(userBody.user);
                const isAdminSupervisor = teacher.person.category.id === personCategories_1.personCategories.ADMINISTRADOR || teacher.person.category.id === personCategories_1.personCategories.SUPERVISOR;
                const year = yield data_source_1.AppDataSource.getRepository(Year_1.Year).findOne({ where: { name: yearName } });
                if (!year)
                    return { status: 404, message: "Ano não encontrado" };
                const { classrooms } = yield this.teacherClassrooms(request === null || request === void 0 ? void 0 : request.body.user);
                if (!classrooms.includes(Number(classroomId)) && !isAdminSupervisor)
                    return { status: 401, message: "Você não tem permissão para acessar essa sala." };
                const classroom = yield data_source_1.AppDataSource.getRepository(Classroom_1.Classroom).findOne({ where: { id: Number(classroomId) }, relations: ["school"] });
                if (!classroom)
                    return { status: 404, message: "Sala não encontrada" };
                const literacyLevels = yield data_source_1.AppDataSource.getRepository(LiteracyLevel_1.LiteracyLevel).find();
                const literacyTiers = yield data_source_1.AppDataSource.getRepository(LiteracyTier_1.LiteracyTier).find();
                const classroomNumber = classroom.shortName.replace(/\D/g, '');
                const allClassrooms = yield data_source_1.AppDataSource.getRepository(Classroom_1.Classroom)
                    .createQueryBuilder('classroom')
                    .leftJoinAndSelect('classroom.school', 'school')
                    .leftJoinAndSelect('classroom.studentClassrooms', 'studentClassroom')
                    .leftJoinAndSelect('studentClassroom.literacies', 'literacies')
                    .leftJoinAndSelect('literacies.literacyLevel', 'literacyLevel')
                    .leftJoinAndSelect('literacies.literacyTier', 'literacyTier')
                    .leftJoinAndSelect('studentClassroom.year', 'year')
                    .where('classroom.shortName LIKE :shortName', { shortName: `%${classroomNumber}%` })
                    .andWhere('year.id = :yearId', { yearId: year.id })
                    .having('COUNT(studentClassroom.id) > 0')
                    .groupBy('classroom.id, school.id, year.id, studentClassroom.id, literacies.id, literacyLevel.id, literacyTier.id')
                    .getMany();
                const schoolClassrooms = allClassrooms.filter((cl) => cl.school.id === classroom.school.id);
                const cityHall = {
                    id: 'ITA',
                    name: 'PREFEITURA DO MUNICIPIO DE ITATIBA',
                    shortName: 'ITA',
                    school: {
                        id: 99,
                        name: 'PREFEITURA DO MUNICIPIO DE ITATIBA',
                        shortName: 'ITATIBA',
                        inep: null,
                        active: true
                    },
                    studentClassrooms: allClassrooms.flatMap(cl => cl.studentClassrooms)
                };
                const header = {
                    city: 'PREFEITURA DO MUNICIPIO DE ITATIBA',
                    literacy: 'Avaliação Diagnóstica',
                    year: year.name,
                    school: classroom.school.name,
                    classroomNumber
                };
                let result = { header, literacyLevels, literacyTiers };
                const arrayOfClassrooms = [...schoolClassrooms, cityHall];
                const resultArray = [];
                for (let classroom of arrayOfClassrooms) {
                    let localClassroom = {
                        id: classroom.id,
                        name: classroom.name,
                        tiers: []
                    };
                    for (let tier of literacyTiers) {
                        let totalPerTier = 0;
                        localClassroom.tiers.push({ id: tier.id, name: tier.name, total: totalPerTier, levels: [] });
                        for (let level of literacyLevels) {
                            let totalPerLevel = 0;
                            const localTier = localClassroom.tiers.find(tr => tr.id === tier.id);
                            localTier === null || localTier === void 0 ? void 0 : localTier.levels.push({ id: level.id, name: level.name, total: totalPerLevel, rate: 0 });
                            const localLevel = localTier === null || localTier === void 0 ? void 0 : localTier.levels.find(lv => lv.id === level.id);
                            for (let st of classroom.studentClassrooms) {
                                for (let el of st.literacies) {
                                    if (((_a = el.literacyLevel) === null || _a === void 0 ? void 0 : _a.id) && tier.id === el.literacyTier.id && level.id === el.literacyLevel.id && el.toRate) {
                                        totalPerLevel += 1;
                                        totalPerTier += 1;
                                        localLevel.total = totalPerLevel;
                                        localTier.total = totalPerTier;
                                    }
                                }
                            }
                        }
                    }
                    resultArray.push(localClassroom);
                }
                for (let result of resultArray) {
                    for (let tier of result.tiers) {
                        for (let level of tier.levels) {
                            level.rate = Math.round((level.total / tier.total) * 100);
                        }
                    }
                }
                return { status: 200, data: Object.assign(Object.assign({}, result), { resultArray }) };
            }
            catch (error) {
                return { status: 500, message: error.message };
            }
        });
    }
    calc(value, studentClassrooms) {
        return studentClassrooms.reduce((total, studentClassroom) => {
            if (studentClassroom.literacies.length === 0)
                return total;
            for (let literacy of studentClassroom.literacies) {
                if (!literacy.literacyLevel)
                    continue;
                if (literacy.literacyTier.id === value.tier.id && literacy.literacyLevel.id === value.level.id)
                    total++;
            }
            return total;
        }, 0);
    }
    updateMany(body) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                for (let item of body.data) {
                    yield data_source_1.AppDataSource.getRepository(Literacy_1.Literacy).save(Object.assign({}, item));
                }
                let result = {};
                return { status: 200, data: result };
            }
            catch (error) {
                return { status: 500, message: error.message };
            }
        });
    }
    updateLiteracy(body) {
        return __awaiter(this, void 0, void 0, function* () {
            const { studentClassroom, literacyTier, literacyLevel, user, toRate } = body;
            try {
                const teacherClasses = yield this.teacherClassrooms(user);
                const stLiteracy = yield data_source_1.AppDataSource.getRepository(Literacy_1.Literacy)
                    .createQueryBuilder('literacy')
                    .leftJoin('literacy.studentClassroom', 'studentClassroom')
                    .leftJoin('studentClassroom.classroom', 'classroom')
                    .leftJoin('literacy.literacyTier', 'literacyTier')
                    .where(new typeorm_1.Brackets(qb => {
                    if (user.category != personCategories_1.personCategories.ADMINISTRADOR && user.category != personCategories_1.personCategories.SUPERVISOR) {
                        qb.where("classroom.id IN (:...teacherClasses)", { teacherClasses: teacherClasses.classrooms });
                    }
                }))
                    .andWhere('studentClassroom.id = :studentClassroomId', { studentClassroomId: studentClassroom.id })
                    .andWhere('literacy.literacyTier = :literacyTierId', { literacyTierId: literacyTier.id })
                    .getOne();
                if (!stLiteracy) {
                    return { status: 400, message: 'Não foi possível processar sua requisição' };
                }
                let literacyLevelDb;
                if (literacyLevel && literacyLevel.id) {
                    literacyLevelDb = yield data_source_1.AppDataSource.getRepository(LiteracyLevel_1.LiteracyLevel).findOne({
                        where: { id: literacyLevel.id }
                    });
                }
                if (!literacyLevel) {
                    literacyLevelDb = null;
                }
                stLiteracy.literacyLevel = literacyLevelDb;
                let result = {};
                if (!studentClassroom.endedAt && toRate) {
                    result = yield data_source_1.AppDataSource.getRepository(Literacy_1.Literacy).save(stLiteracy);
                }
                return { status: 200, data: result };
            }
            catch (error) {
                return { status: 500, message: error.message };
            }
        });
    }
}
exports.literacyController = new LiteracyController();

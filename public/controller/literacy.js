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
                return yield data_source_1.AppDataSource.transaction((CONN) => __awaiter(this, void 0, void 0, function* () {
                    const teacherClasses = yield this.teacherClassrooms(req.body.user, CONN);
                    const data = yield CONN.getRepository(Classroom_1.Classroom)
                        .createQueryBuilder("classroom")
                        .leftJoinAndSelect("classroom.school", "school")
                        .leftJoinAndSelect("classroom.category", "category")
                        .leftJoinAndSelect("classroom.studentClassrooms", "studentClassroom")
                        .leftJoinAndSelect("studentClassroom.year", "year")
                        .leftJoin("studentClassroom.literacies", "literacies")
                        .where(new typeorm_1.Brackets((qb) => { if (userBody.category != personCategories_1.pc.ADMN && userBody.category != personCategories_1.pc.SUPE) {
                        qb.where("classroom.id IN (:...teacherClasses)", { teacherClasses: teacherClasses.classrooms });
                    } }))
                        .andWhere("category.id = :categoryId", { categoryId: classroomCategory_1.classroomCategory.PEB_I })
                        .andWhere("literacies.id IS NOT NULL")
                        .andWhere("classroom.active = :active", { active: true })
                        .andWhere("year.name = :yearName", { yearName })
                        .andWhere(new typeorm_1.Brackets((qb) => { if (search) {
                        qb.where("school.name LIKE :search", { search: `%${search}%` }).orWhere("school.shortName LIKE :search", { search: `%${search}%` });
                    } }))
                        .orderBy("school.name", "ASC")
                        .getMany();
                    return { status: 200, data };
                }));
            }
            catch (error) {
                return { status: 500, message: error.message };
            }
        });
    }
    getStudentClassrooms(request) {
        return __awaiter(this, void 0, void 0, function* () {
            const yearName = request === null || request === void 0 ? void 0 : request.params.year;
            const userBody = request === null || request === void 0 ? void 0 : request.body.user;
            const classroomId = request === null || request === void 0 ? void 0 : request.params.id;
            try {
                return data_source_1.AppDataSource.transaction((CONN) => __awaiter(this, void 0, void 0, function* () {
                    var _a;
                    const teacherClasses = yield this.teacherClassrooms(request === null || request === void 0 ? void 0 : request.body.user, CONN);
                    const literacyLevels = yield CONN.find(LiteracyLevel_1.LiteracyLevel);
                    const literacyTiers = yield CONN.find(LiteracyTier_1.LiteracyTier);
                    const classroom = yield CONN.findOne(Classroom_1.Classroom, { where: { id: Number(classroomId) } });
                    const studentClassrooms = yield this.studentClassesLiteracy(classroom, userBody, teacherClasses, yearName, CONN);
                    const resultArray = [];
                    for (let tier of literacyTiers) {
                        let totalPerTier = 0;
                        let localTier = { id: tier.id, name: tier.name, total: totalPerTier, levels: [] };
                        resultArray.push(localTier);
                        for (let level of literacyLevels) {
                            let totalPerLevel = 0;
                            const auxLocalTier = resultArray.find((el) => el.id === tier.id);
                            auxLocalTier === null || auxLocalTier === void 0 ? void 0 : auxLocalTier.levels.push({ id: level.id, name: level.name, total: totalPerLevel, rate: 0 });
                            const auxLocalLevel = auxLocalTier === null || auxLocalTier === void 0 ? void 0 : auxLocalTier.levels.find((el) => el.id === level.id);
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
                }));
            }
            catch (error) {
                return { status: 500, message: error.message };
            }
        });
    }
    studentClassesLiteracy(classroom, userBody, teacherClasses, yearName, CONN) {
        return __awaiter(this, void 0, void 0, function* () {
            const classroomNumber = classroom.shortName.replace(/\D/g, "");
            const lastYear = yield CONN.findOne(Year_1.Year, { where: { name: String(Number(yearName) - 1) } });
            let studentClassrooms;
            studentClassrooms = yield CONN.getRepository(StudentClassroom_1.StudentClassroom)
                .createQueryBuilder("studentClassroom")
                .leftJoinAndSelect("studentClassroom.year", "year")
                .leftJoinAndSelect("studentClassroom.student", "student")
                .leftJoinAndSelect("student.person", "person")
                .leftJoinAndSelect("studentClassroom.literacies", "literacies")
                .leftJoinAndSelect("literacies.literacyLevel", "literacyLevel")
                .leftJoinAndSelect("literacies.literacyTier", "literacyTier")
                .leftJoinAndSelect("studentClassroom.classroom", "classroom")
                .leftJoinAndSelect("classroom.school", "school")
                .where(new typeorm_1.Brackets((qb) => {
                if (userBody.category != personCategories_1.pc.ADMN && userBody.category != personCategories_1.pc.SUPE) {
                    qb.where("classroom.id IN (:...teacherClasses)", { teacherClasses: teacherClasses.classrooms });
                }
            }))
                .andWhere("classroom.id = :classroomId", { classroomId: classroom.id })
                .andWhere("literacies.id IS NOT NULL")
                .andWhere("year.name = :yearName", { yearName })
                .orderBy("studentClassroom.rosterNumber", "ASC")
                .getMany();
            if (!lastYear || Number(classroomNumber) === 1) {
                const result = studentClassrooms.map((studentClassroom) => __awaiter(this, void 0, void 0, function* () {
                    var _a;
                    const literacyFirsts = yield CONN.findOne(LiteracyFirst_1.LiteracyFirst, { where: { student: { id: studentClassroom.student.id } }, relations: ["literacyLevel"] });
                    return Object.assign(Object.assign({}, studentClassroom), { literacyFirsts: { id: literacyFirsts === null || literacyFirsts === void 0 ? void 0 : literacyFirsts.id, literacyLevel: (_a = literacyFirsts === null || literacyFirsts === void 0 ? void 0 : literacyFirsts.literacyLevel) !== null && _a !== void 0 ? _a : { id: "NA", name: "NA", shortName: "NA" } } });
                }));
                return yield Promise.all(result);
            }
            const result = studentClassrooms.map((studentClassroom) => __awaiter(this, void 0, void 0, function* () {
                var _a, _b;
                const studentId = studentClassroom.student.id;
                const lastLiteracy = yield CONN.getRepository(Literacy_1.Literacy)
                    .createQueryBuilder("literacy")
                    .innerJoin("literacy.studentClassroom", "studentClassroom")
                    .innerJoin("studentClassroom.year", "year")
                    .innerJoin("studentClassroom.student", "student")
                    .innerJoin("literacy.literacyTier", "literacyTier")
                    .leftJoinAndSelect("literacy.literacyLevel", "literacyLevel")
                    .where("student.id = :studentId", { studentId })
                    .andWhere("literacyLevel.id IS NOT NULL") // Garante que o literacyLevel não seja nulo
                    .andWhere("year.name = :yearName", { yearName: lastYear === null || lastYear === void 0 ? void 0 : lastYear.name })
                    .orderBy("literacyTier.id", "DESC") // Ordena por ordem decrescente de ID do literacyTier
                    .addOrderBy("literacy.id", "DESC") // Em caso de empate no ID do literacyTier, usa o ID do literacy
                    .getOne();
                if (!(lastLiteracy === null || lastLiteracy === void 0 ? void 0 : lastLiteracy.literacyLevel)) {
                    const literacyFirsts = yield CONN.findOne(LiteracyFirst_1.LiteracyFirst, { where: { student: { id: studentClassroom.student.id } }, relations: ["literacyLevel"] });
                    return Object.assign(Object.assign({}, studentClassroom), { literacyFirsts: { id: literacyFirsts === null || literacyFirsts === void 0 ? void 0 : literacyFirsts.id, literacyLevel: (_a = literacyFirsts === null || literacyFirsts === void 0 ? void 0 : literacyFirsts.literacyLevel) !== null && _a !== void 0 ? _a : { id: "NA", name: "NA", shortName: "NA" } } });
                }
                return Object.assign(Object.assign({}, studentClassroom), { literacyFirsts: { id: lastLiteracy === null || lastLiteracy === void 0 ? void 0 : lastLiteracy.id, literacyLevel: (_b = lastLiteracy === null || lastLiteracy === void 0 ? void 0 : lastLiteracy.literacyLevel) !== null && _b !== void 0 ? _b : { id: "NA", name: "NA", shortName: "NA" } } });
            }));
            return yield Promise.all(result);
        });
    }
    getTotals(request) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                return yield data_source_1.AppDataSource.transaction((CONN) => __awaiter(this, void 0, void 0, function* () {
                    var _a;
                    const uTeacher = yield this.teacherByUser(request === null || request === void 0 ? void 0 : request.body.user.user, CONN);
                    const masterUser = uTeacher.person.category.id === personCategories_1.pc.ADMN || uTeacher.person.category.id === personCategories_1.pc.SUPE || uTeacher.person.category.id === personCategories_1.pc.FORM;
                    const year = yield CONN.findOne(Year_1.Year, { where: { name: request === null || request === void 0 ? void 0 : request.params.year } });
                    if (!year)
                        return { status: 404, message: "Ano não encontrado" };
                    const { classrooms } = yield this.teacherClassrooms(request === null || request === void 0 ? void 0 : request.body.user, CONN);
                    if (!classrooms.includes(Number(request === null || request === void 0 ? void 0 : request.params.id)) && !masterUser) {
                        return { status: 403, message: "Você não tem permissão para acessar essa sala." };
                    }
                    const classroom = yield CONN.findOne(Classroom_1.Classroom, { where: { id: Number(request === null || request === void 0 ? void 0 : request.params.id) }, relations: ["school"] });
                    if (!classroom)
                        return { status: 404, message: "Sala não encontrada" };
                    const literacyLevels = yield CONN.find(LiteracyLevel_1.LiteracyLevel);
                    const literacyTiers = yield CONN.find(LiteracyTier_1.LiteracyTier);
                    const classroomNumber = classroom.shortName.replace(/\D/g, "");
                    const allClassrooms = yield CONN.getRepository(Classroom_1.Classroom)
                        .createQueryBuilder("classroom")
                        .leftJoinAndSelect("classroom.school", "school")
                        .leftJoinAndSelect("classroom.studentClassrooms", "studentClassroom")
                        .leftJoinAndSelect("studentClassroom.literacies", "literacies")
                        .leftJoinAndSelect("literacies.literacyLevel", "literacyLevel")
                        .leftJoinAndSelect("literacies.literacyTier", "literacyTier")
                        .leftJoinAndSelect("studentClassroom.year", "year")
                        .where("classroom.shortName LIKE :shortName", { shortName: `%${classroomNumber}%` })
                        .andWhere("year.id = :yearId", { yearId: year.id })
                        .having("COUNT(studentClassroom.id) > 0")
                        .groupBy("classroom.id, school.id, year.id, studentClassroom.id, literacies.id, literacyLevel.id, literacyTier.id")
                        .getMany();
                    const schoolClassrooms = allClassrooms.filter((cl) => cl.school.id === classroom.school.id);
                    const cityHall = {
                        id: "ITA",
                        name: "PREFEITURA DO MUNICIPIO DE ITATIBA",
                        shortName: "ITA",
                        school: { id: 99, name: "PREFEITURA DO MUNICIPIO DE ITATIBA", shortName: "ITATIBA", inep: null, active: true },
                        studentClassrooms: allClassrooms.flatMap((cl) => cl.studentClassrooms),
                    };
                    const header = { city: "PREFEITURA DO MUNICIPIO DE ITATIBA", literacy: "Avaliação Diagnóstica", year: year.name, school: classroom.school.name, classroomNumber };
                    let result = { header, literacyLevels, literacyTiers };
                    const arrayOfClassrooms = [...schoolClassrooms, cityHall];
                    const resultArray = [];
                    for (let classroom of arrayOfClassrooms) {
                        let localClassroom = { id: classroom.id, name: classroom.name, tiers: [] };
                        for (let tier of literacyTiers) {
                            let totalPerTier = 0;
                            localClassroom.tiers.push({ id: tier.id, name: tier.name, total: totalPerTier, levels: [] });
                            for (let level of literacyLevels) {
                                let totalPerLevel = 0;
                                const localTier = localClassroom.tiers.find((tr) => tr.id === tier.id);
                                localTier === null || localTier === void 0 ? void 0 : localTier.levels.push({ id: level.id, name: level.name, total: totalPerLevel, rate: 0 });
                                const localLevel = localTier === null || localTier === void 0 ? void 0 : localTier.levels.find((lv) => lv.id === level.id);
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
                }));
            }
            catch (error) {
                return { status: 500, message: error.message };
            }
        });
    }
    updateMany(body) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                return yield data_source_1.AppDataSource.transaction((CONN) => __awaiter(this, void 0, void 0, function* () {
                    const uTeacher = yield this.teacherByUser(body.user.user, CONN);
                    for (let item of body.data) {
                        yield CONN.save(Literacy_1.Literacy, Object.assign(Object.assign({}, item), { updatedAt: new Date(), updatedByUser: uTeacher.person.user.id }));
                    }
                    return { status: 200, data: {} };
                }));
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
                let result = {};
                return yield data_source_1.AppDataSource.transaction((CONN) => __awaiter(this, void 0, void 0, function* () {
                    const uTeacher = yield this.teacherByUser(body.user.user, CONN);
                    const teacherClasses = yield this.teacherClassrooms(user, CONN);
                    const stLiteracy = yield CONN.getRepository(Literacy_1.Literacy)
                        .createQueryBuilder("literacy")
                        .leftJoin("literacy.studentClassroom", "studentClassroom")
                        .leftJoin("studentClassroom.classroom", "classroom")
                        .leftJoin("literacy.literacyTier", "literacyTier")
                        .where(new typeorm_1.Brackets((qb) => { if (user.category != personCategories_1.pc.ADMN && user.category != personCategories_1.pc.SUPE) {
                        qb.where("classroom.id IN (:...teacherClasses)", { teacherClasses: teacherClasses.classrooms });
                    } }))
                        .andWhere("studentClassroom.id = :studentClassroomId", { studentClassroomId: studentClassroom.id })
                        .andWhere("literacy.literacyTier = :literacyTierId", { literacyTierId: literacyTier.id })
                        .getOne();
                    if (!stLiteracy) {
                        return { status: 400, message: "Não foi possível processar sua requisição" };
                    }
                    let literacyLevelDb;
                    if (literacyLevel && literacyLevel.id) {
                        literacyLevelDb = yield CONN.findOne(LiteracyLevel_1.LiteracyLevel, { where: { id: literacyLevel.id } });
                    }
                    if (!literacyLevel) {
                        literacyLevelDb = null;
                    }
                    if (!studentClassroom.endedAt && toRate) {
                        result = yield CONN.save(Literacy_1.Literacy, Object.assign(Object.assign({}, stLiteracy), { literacyLevel: literacyLevelDb, updatedAt: new Date(), updatedByUser: uTeacher.person.user.id }));
                    }
                    return { status: 200, data: result };
                }));
            }
            catch (error) {
                return { status: 500, message: error.message };
            }
        });
    }
}
exports.literacyController = new LiteracyController();

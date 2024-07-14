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
exports.textGenderGradeController = void 0;
const TextGenderExam_1 = require("../model/TextGenderExam");
const genericController_1 = require("./genericController");
const typeorm_1 = require("typeorm");
const TextGenderGrade_1 = require("../model/TextGenderGrade");
const data_source_1 = require("../data-source");
const Classroom_1 = require("../model/Classroom");
const Year_1 = require("../model/Year");
const TextGender_1 = require("../model/TextGender");
const StudentClassroom_1 = require("../model/StudentClassroom");
const TextGenderExamTier_1 = require("../model/TextGenderExamTier");
const personCategories_1 = require("../utils/personCategories");
const TextGenderExamLevel_1 = require("../model/TextGenderExamLevel");
const TextGenderClassroom_1 = require("../model/TextGenderClassroom");
class TextGenderGradeController extends genericController_1.GenericController {
    constructor() { super(TextGenderGrade_1.TextGenderGrade); }
    getAll(req) {
        return __awaiter(this, void 0, void 0, function* () {
            const { classroom: classId, year: yearName, gender: genderId } = req.params;
            try {
                return data_source_1.AppDataSource.transaction((CONN) => __awaiter(this, void 0, void 0, function* () {
                    var _a;
                    const classroom = yield CONN.findOne(Classroom_1.Classroom, { relations: ["school"], where: { id: Number(classId) } });
                    if (!classroom)
                        return { status: 404, message: "Sala não encontrada" };
                    const year = yield CONN.findOne(Year_1.Year, { where: { name: yearName } });
                    if (!year)
                        return { status: 404, message: "Ano não encontrado" };
                    const gender = yield CONN.findOne(TextGender_1.TextGender, { where: { id: Number(genderId) } });
                    if (!gender)
                        return { status: 404, message: "Gênero não encontrado" };
                    const examLevel = yield CONN.getRepository(TextGenderExam_1.TextGenderExam)
                        .createQueryBuilder("textGenderExam")
                        .leftJoinAndSelect("textGenderExam.textGenderExamLevelGroups", "textGenderExamLevelGroup")
                        .leftJoinAndSelect("textGenderExamLevelGroup.textGenderExamLevel", "textGenderExamLevel")
                        .getMany();
                    const examTier = yield CONN.getRepository(TextGenderExamTier_1.TextGenderExamTier)
                        .createQueryBuilder("textGenderExamTier")
                        .getMany();
                    const result = yield CONN.getRepository(StudentClassroom_1.StudentClassroom)
                        .createQueryBuilder("studentClassroom")
                        .leftJoin("studentClassroom.classroom", "classroom")
                        .leftJoin("studentClassroom.year", "year")
                        .leftJoinAndSelect("studentClassroom.student", "student")
                        .leftJoinAndSelect("student.person", "person")
                        .leftJoinAndSelect("studentClassroom.textGenderGrades", "textGenderGrade")
                        .leftJoinAndSelect("textGenderGrade.textGender", "textGender")
                        .leftJoinAndSelect("textGenderGrade.textGenderExam", "textGenderExam")
                        .leftJoinAndSelect("textGenderGrade.textGenderExamTier", "textGenderExamTier")
                        .leftJoinAndSelect("textGenderGrade.textGenderExamLevel", "textGenderExamLevel")
                        .where("classroom.id = :classId", { classId })
                        .andWhere("year.name = :yearName", { yearName })
                        .andWhere("textGender.id = :genderId", { genderId })
                        .getMany();
                    const finalResult = { gender: gender, year: year, classroom: classroom, headers: { examLevel, examTier }, data: result };
                    const resultArray = [];
                    for (let exam of examLevel) {
                        let localExam = { id: exam.id, name: exam.name, tiers: [] };
                        resultArray.push(localExam);
                        for (let tier of examTier) {
                            let totalPerTier = 0;
                            const auxLocalExamLevel = resultArray.find((el) => el.id === exam.id);
                            auxLocalExamLevel === null || auxLocalExamLevel === void 0 ? void 0 : auxLocalExamLevel.tiers.push({ id: tier.id, name: tier.name, levels: [], total: totalPerTier });
                            for (let level of exam.textGenderExamLevelGroups) {
                                let totalPerLevel = 0;
                                const auxLocalTier = auxLocalExamLevel === null || auxLocalExamLevel === void 0 ? void 0 : auxLocalExamLevel.tiers.find((el) => el.id === tier.id);
                                auxLocalTier === null || auxLocalTier === void 0 ? void 0 : auxLocalTier.levels.push({ id: level.textGenderExamLevel.id, name: level.textGenderExamLevel.name, total: totalPerLevel, rate: 0 });
                                const auxLocalTierLevel = auxLocalTier === null || auxLocalTier === void 0 ? void 0 : auxLocalTier.levels.find((el) => el.id === level.textGenderExamLevel.id);
                                for (let st of result) {
                                    for (let el of st.textGenderGrades) {
                                        if (((_a = el.textGenderExamLevel) === null || _a === void 0 ? void 0 : _a.id) && exam.id === el.textGenderExam.id && tier.id === el.textGenderExamTier.id && level.textGenderExamLevel.id === el.textGenderExamLevel.id && el.toRate) {
                                            totalPerTier += 1;
                                            totalPerLevel += 1;
                                            auxLocalTier.total = totalPerTier;
                                            auxLocalTierLevel.total = totalPerLevel;
                                        }
                                    }
                                }
                            }
                        }
                    }
                    for (let exam of resultArray) {
                        for (let tier of exam.tiers) {
                            for (let level of tier.levels) {
                                level.rate = Math.round((level.total / tier.total) * 100);
                            }
                        }
                    }
                    return { status: 200, data: Object.assign(Object.assign({}, finalResult), { resultArray }) };
                }));
            }
            catch (error) {
                return { status: 500, message: error.message };
            }
        });
    }
    getTotals(request) {
        return __awaiter(this, void 0, void 0, function* () {
            const { user: userBody } = request.body;
            const { classroom: classId, year: yearName } = request.params;
            try {
                return yield data_source_1.AppDataSource.transaction((CONN) => __awaiter(this, void 0, void 0, function* () {
                    var _a;
                    const uTeacher = yield this.teacherByUser(userBody.user, CONN);
                    const masterUser = uTeacher.person.category.id === personCategories_1.pc.ADMN || uTeacher.person.category.id === personCategories_1.pc.SUPE;
                    const { classrooms } = yield this.teacherClassrooms(request === null || request === void 0 ? void 0 : request.body.user, CONN);
                    if (!classrooms.includes(Number(classId)) && !masterUser) {
                        return { status: 403, message: "Você não tem permissão para acessar essa sala." };
                    }
                    const classroom = yield CONN.findOne(Classroom_1.Classroom, { relations: ["school"], where: { id: Number(classId) } });
                    if (!classroom)
                        return { status: 404, message: "Sala não encontrada" };
                    const classroomNumber = classroom.shortName.replace(/\D/g, "");
                    const year = yield CONN.findOne(Year_1.Year, { where: { name: yearName } });
                    if (!year)
                        return { status: 404, message: "Ano não encontrado" };
                    const examLevel = yield CONN.getRepository(TextGenderExam_1.TextGenderExam)
                        .createQueryBuilder("textGenderExam")
                        .leftJoinAndSelect("textGenderExam.textGenderExamLevelGroups", "textGenderExamLevelGroup")
                        .leftJoinAndSelect("textGenderExamLevelGroup.textGenderExamLevel", "textGenderExamLevel")
                        .getMany();
                    const examTier = yield CONN.getRepository(TextGenderExamTier_1.TextGenderExamTier)
                        .createQueryBuilder("textGenderExamTier")
                        .getMany();
                    const genders = yield CONN.getRepository(TextGenderClassroom_1.TextGenderClassroom)
                        .createQueryBuilder("textGenderClassroom")
                        .leftJoinAndSelect("textGenderClassroom.textGender", "textGender")
                        .where("classroomNumber = :classroomNumber", { classroomNumber })
                        .getMany();
                    const allData = [];
                    for (let gender of genders) {
                        const classrooms = yield CONN.getRepository(Classroom_1.Classroom)
                            .createQueryBuilder("classroom")
                            .leftJoinAndSelect("classroom.school", "school")
                            .leftJoinAndSelect("classroom.studentClassrooms", "studentClassrooms")
                            .leftJoinAndSelect("studentClassrooms.year", "year")
                            .leftJoinAndSelect("studentClassrooms.textGenderGrades", "textGenderGrades")
                            .leftJoinAndSelect("textGenderGrades.textGender", "textGender")
                            .leftJoinAndSelect("textGenderGrades.textGenderExam", "textGenderExam")
                            .leftJoinAndSelect("textGenderGrades.textGenderExamTier", "textGenderExamTier")
                            .leftJoinAndSelect("textGenderGrades.textGenderExamLevel", "textGenderExamLevel")
                            .where("classroom.shortName LIKE :shortName", { shortName: `%${classroomNumber}%` })
                            .andWhere("year.id = :yearId", { yearId: year.id })
                            .andWhere("textGender.id = :textGenderId", { textGenderId: gender.textGender.id })
                            .getMany();
                        allData.push({ id: gender.textGender.id, name: gender.textGender.name, classrooms });
                    }
                    const schoolAndCity = allData.map((el) => { return Object.assign(Object.assign({}, el), { classrooms: el.classrooms.filter((cl) => cl.school.id === classroom.school.id) }); });
                    for (let gender of genders) {
                        const cityHall = this.createCityHall();
                        const groupIndex = schoolAndCity.findIndex((el) => el.id === gender.textGender.id);
                        const preResult = allData.filter((el) => el.id === gender.textGender.id);
                        cityHall.studentClassrooms = preResult.flatMap((el) => el.classrooms.flatMap((st) => st.studentClassrooms));
                        schoolAndCity[groupIndex].classrooms.push(cityHall);
                    }
                    const result = { year, classroom, classroomNumber, genders, headers: { examLevel, examTier }, groups: schoolAndCity };
                    const resultArray = [];
                    for (let txtGender of schoolAndCity) {
                        let localTxtGender = { id: txtGender.id, name: txtGender.name, classrooms: [] };
                        resultArray.push(localTxtGender);
                        for (let classroom of txtGender.classrooms) {
                            const auxLocalTextGender = resultArray.find((el) => el.id === txtGender.id);
                            auxLocalTextGender === null || auxLocalTextGender === void 0 ? void 0 : auxLocalTextGender.classrooms.push({ id: classroom.id, name: classroom.shortName, exams: [] });
                            for (let exam of examLevel) {
                                const auxLocalClassroom = auxLocalTextGender === null || auxLocalTextGender === void 0 ? void 0 : auxLocalTextGender.classrooms.find((el) => el.id === classroom.id);
                                auxLocalClassroom === null || auxLocalClassroom === void 0 ? void 0 : auxLocalClassroom.exams.push({ id: exam.id, name: exam.name, tiers: [] });
                                for (let tier of examTier) {
                                    let totalPerTier = 0;
                                    const auxLocalExam = auxLocalClassroom === null || auxLocalClassroom === void 0 ? void 0 : auxLocalClassroom.exams.find((el) => el.id === exam.id);
                                    auxLocalExam === null || auxLocalExam === void 0 ? void 0 : auxLocalExam.tiers.push({ id: tier.id, name: tier.name, levels: [], total: totalPerTier });
                                    for (let level of exam.textGenderExamLevelGroups) {
                                        let totalPerLevel = 0;
                                        const auxLocalTier = auxLocalExam === null || auxLocalExam === void 0 ? void 0 : auxLocalExam.tiers.find((el) => el.id === tier.id);
                                        auxLocalTier === null || auxLocalTier === void 0 ? void 0 : auxLocalTier.levels.push({ id: level.textGenderExamLevel.id, name: level.textGenderExamLevel.name, rate: 0, total: totalPerLevel });
                                        const auxLocalTierLevel = auxLocalTier === null || auxLocalTier === void 0 ? void 0 : auxLocalTier.levels.find((el) => el.id === level.textGenderExamLevel.id);
                                        for (let el of classroom.studentClassrooms.flatMap((el) => el.textGenderGrades)) {
                                            if (((_a = el.textGenderExamLevel) === null || _a === void 0 ? void 0 : _a.id) && el.textGender.id === txtGender.id && exam.id === el.textGenderExam.id && tier.id === el.textGenderExamTier.id && level.textGenderExamLevel.id === el.textGenderExamLevel.id && el.toRate) {
                                                totalPerTier += 1;
                                                totalPerLevel += 1;
                                                auxLocalTier.total = totalPerTier;
                                                auxLocalTierLevel.total = totalPerLevel;
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                    for (let textGender of resultArray) {
                        for (let classroom of textGender.classrooms) {
                            for (let exams of classroom.exams) {
                                for (let tier of exams.tiers) {
                                    for (let level of tier.levels) {
                                        level.rate = Math.round((level.total / tier.total) * 100);
                                    }
                                }
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
    updateExamGrade(body) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                return yield data_source_1.AppDataSource.transaction((CONN) => __awaiter(this, void 0, void 0, function* () {
                    const teacherClasses = yield this.teacherClassrooms(body.user, CONN);
                    const stTextGenderGrade = yield CONN.getRepository(TextGenderGrade_1.TextGenderGrade)
                        .createQueryBuilder("textGenderGrade")
                        .leftJoin("textGenderGrade.studentClassroom", "studentClassroom")
                        .leftJoin("studentClassroom.classroom", "classroom")
                        .leftJoin("textGenderGrade.textGender", "textGender")
                        .leftJoin("textGenderGrade.textGenderExam", "textGenderExam")
                        .leftJoin("textGenderGrade.textGenderExamTier", "textGenderExamTier")
                        .where(new typeorm_1.Brackets((qb) => {
                        if (body.user.category != personCategories_1.pc.ADMN && body.user.category != personCategories_1.pc.SUPE) {
                            qb.where("classroom.id IN (:...teacherClasses)", { teacherClasses: teacherClasses.classrooms });
                        }
                    }))
                        .andWhere("studentClassroom.id = :studentClassroomId", { studentClassroomId: body.studentClassroom.id })
                        .andWhere("textGender.id = :textGenderId", { textGenderId: body.textGender.id })
                        .andWhere("textGenderExam.id = :textGenderExamId", { textGenderExamId: body.textGenderExam.id })
                        .andWhere("textGenderExamTier.id = :textGenderExamTierId", { textGenderExamTierId: body.textGenderExamTier.id })
                        .getOne();
                    if (!stTextGenderGrade) {
                        return { status: 400, message: "Não foi possível processar sua requisição" };
                    }
                    let textGenderExamTierLevelDb;
                    const options = { where: { id: body.textGenderExamTierLevel.id } };
                    if (body.textGenderExamTierLevel && body.textGenderExamTierLevel.id) {
                        textGenderExamTierLevelDb = yield CONN.findOne(TextGenderExamLevel_1.TextGenderExamLevel, Object.assign({}, options));
                    }
                    if (!body.textGenderExamTierLevel) {
                        textGenderExamTierLevelDb = null;
                    }
                    stTextGenderGrade.textGenderExamLevel = textGenderExamTierLevelDb;
                    let result = {};
                    if (!body.studentClassroom.endedAt && body.toRate) {
                        result = yield CONN.save(TextGenderGrade_1.TextGenderGrade, stTextGenderGrade);
                    }
                    return { status: 200, data: result };
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
                    for (let item of body.data) {
                        yield CONN.save(TextGenderGrade_1.TextGenderGrade, Object.assign({}, item));
                    }
                    let data = {};
                    return { status: 200, data };
                }));
            }
            catch (error) {
                return { status: 500, message: error.message };
            }
        });
    }
    createCityHall() {
        return {
            id: "ITA",
            name: "PREFEITURA DO MUNICIPIO DE ITATIBA",
            shortName: "ITA",
            school: { id: 99, name: "PREFEITURA DO MUNICIPIO DE ITATIBA", shortName: "ITATIBA", inep: null, active: true }, studentClassrooms: []
        };
    }
}
exports.textGenderGradeController = new TextGenderGradeController();

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
exports.textGenderGradeReportController = void 0;
const TextGenderExam_1 = require("../model/TextGenderExam");
const genericController_1 = require("./genericController");
const typeorm_1 = require("typeorm");
const TextGenderGrade_1 = require("../model/TextGenderGrade");
const data_source_1 = require("../data-source");
const Year_1 = require("../model/Year");
const TextGender_1 = require("../model/TextGender");
const TextGenderExamTier_1 = require("../model/TextGenderExamTier");
const School_1 = require("../model/School");
class TextGenderGradeReportController extends genericController_1.GenericController {
    constructor() {
        super(TextGenderGrade_1.TextGenderGrade);
    }
    getReport(request) {
        var _a, _b, _c, _d, _e, _f, _g;
        return __awaiter(this, void 0, void 0, function* () {
            const { classroom: classroomNumber, year: yearName, textgender: textGenderId } = request.params;
            const { search } = request.query;
            try {
                const [year, examLevel, examTier, textGender] = yield Promise.all([
                    this.getYear(yearName),
                    this.getExamLevel(),
                    this.getexamTier(),
                    this.getTextGender(textGenderId)
                ]);
                if (!year)
                    return { status: 404, message: 'Ano não encontrado.' };
                const allData = yield this.getAllData(classroomNumber, textGender, year);
                const filteredSchool = yield this.filteredSchool(classroomNumber, textGender, year, search);
                const arrOfSchools = filteredSchool.map(school => ({
                    id: school.id,
                    name: school.name,
                    shortName: school.shortName,
                    studentsClassrooms: school.classrooms.flatMap(classroom => classroom.studentClassrooms)
                }));
                const cityHall = {
                    id: 'ITA',
                    name: 'PREFEITURA DO MUNICIPIO DE ITATIBA',
                    shortName: 'ITA',
                    studentsClassrooms: allData.flatMap(school => school.classrooms.flatMap(classroom => classroom.studentClassrooms))
                };
                const examLevelLabels = this.examTotalizer(examLevel, examTier).map(el => el.graphicLabel);
                const result = {
                    classroomNumber,
                    year,
                    headers: { examLevel, examTier },
                    schools: [...arrOfSchools, cityHall],
                    examLevelLabels
                };
                const finalArray = [...arrOfSchools, cityHall];
                const resultArray = [];
                for (let row of finalArray) {
                    let localSchool = {
                        id: row.id,
                        name: row.name,
                        exams: []
                    };
                    for (let exam of examLevel) {
                        localSchool.exams.push({ id: exam.id, name: exam.name, tiers: [] });
                        for (let tier of examTier) {
                            let totalPerTier = 0;
                            (_a = localSchool.exams.find(el => el.id === exam.id)) === null || _a === void 0 ? void 0 : _a.tiers.push({ id: tier.id, name: tier.name, total: totalPerTier, levels: [] });
                            for (let level of exam.textGenderExamLevelGroups) {
                                let totalPerLevel = 0;
                                (_c = (_b = localSchool.exams.find(el => el.id === exam.id)) === null || _b === void 0 ? void 0 : _b.tiers.find(el => el.id === tier.id)) === null || _c === void 0 ? void 0 : _c.levels.push({ id: level.textGenderExamLevel.id, name: level.textGenderExamLevel.name, rate: 0, total: totalPerLevel });
                                for (let st of row.studentsClassrooms) {
                                    for (let el of st.textGenderGrades) {
                                        if (((_d = el.textGenderExamLevel) === null || _d === void 0 ? void 0 : _d.id) && exam.id === el.textGenderExam.id && tier.id === el.textGenderExamTier.id && level.textGenderExamLevel.id === el.textGenderExamLevel.id && el.toRate) {
                                            totalPerTier += 1;
                                            totalPerLevel += 1;
                                            const auxLocalLevel = (_f = (_e = localSchool.exams.find(el => el.id === exam.id)) === null || _e === void 0 ? void 0 : _e.tiers.find(el => el.id === tier.id)) === null || _f === void 0 ? void 0 : _f.levels.find(el => el.id === level.textGenderExamLevel.id);
                                            auxLocalLevel.total = totalPerLevel;
                                            const auxLocalTier = (_g = localSchool.exams.find(el => el.id === exam.id)) === null || _g === void 0 ? void 0 : _g.tiers.find(el => el.id === tier.id);
                                            auxLocalTier.total = totalPerTier;
                                        }
                                    }
                                }
                            }
                        }
                    }
                    resultArray.push(localSchool);
                }
                const totals = [];
                const rates = [];
                for (let row of resultArray) {
                    for (let exam of row.exams) {
                        for (let tier of exam.tiers) {
                            for (let level of tier.levels) {
                                level.rate = Math.round((level.total / tier.total) * 100);
                                if (isNaN(row.id)) {
                                    totals.push(level.total);
                                    rates.push(level.rate);
                                }
                            }
                        }
                    }
                }
                return { status: 200, data: Object.assign(Object.assign({}, result), { resultArray, totals, rates }) };
            }
            catch (error) {
                return { status: 500, message: error.message };
            }
        });
    }
    getYear(yearName) {
        return data_source_1.AppDataSource.getRepository(Year_1.Year).findOne({ where: { name: yearName } });
    }
    getTextGender(textGenderId) {
        return data_source_1.AppDataSource.getRepository(TextGender_1.TextGender)
            .createQueryBuilder('textGender')
            .where('textGender.id = :textGenderId', { textGenderId })
            .getOne();
    }
    getExamLevel() {
        return data_source_1.AppDataSource.getRepository(TextGenderExam_1.TextGenderExam)
            .createQueryBuilder('textGenderExam')
            .leftJoinAndSelect('textGenderExam.textGenderExamLevelGroups', 'textGenderExamLevelGroup')
            .leftJoinAndSelect('textGenderExamLevelGroup.textGenderExamLevel', 'textGenderExamLevel')
            .getMany();
    }
    getexamTier() {
        return data_source_1.AppDataSource.getRepository(TextGenderExamTier_1.TextGenderExamTier)
            .createQueryBuilder('textGenderExamTier')
            .getMany();
    }
    createCityHall() {
        return {
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
            studentClassrooms: []
        };
    }
    examTotalizer(examLevel, examTier) {
        const examTotalizer = [];
        for (let exam of examLevel) {
            for (let tier of examTier) {
                for (let examLevel of exam.textGenderExamLevelGroups.flatMap(el => el.textGenderExamLevel)) {
                    const index = examTotalizer.findIndex(el => el.examId === exam.id && el.examTierId === tier.id && el.examTierLevelId === examLevel.id);
                    if (index === -1) {
                        examTotalizer.push({
                            examId: exam.id,
                            examLabel: exam.name,
                            examTierId: tier.id,
                            examTierLabel: tier.name,
                            examTierLevelId: examLevel.id,
                            examTierLevelLabel: examLevel.name,
                            total: 0,
                            rate: 0,
                            graphicLabel: tier.id === 1 ? `${exam.name.split(" ").join("").slice(0, 4)} - 1 - ${examLevel.name.split(" ").join("").slice(0, 2)}` : `${exam.name.split(" ").join("").slice(0, 4)} - 2 - ${examLevel.name.split(" ").join("").slice(0, 2)}`
                        });
                    }
                }
            }
        }
        return examTotalizer;
    }
    getAllData(classroomNumber, textGender, year) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield data_source_1.AppDataSource.getRepository(School_1.School)
                .createQueryBuilder('school')
                .leftJoinAndSelect('school.classrooms', 'classroom')
                .leftJoinAndSelect('classroom.studentClassrooms', 'studentClassrooms')
                .leftJoinAndSelect('studentClassrooms.student', 'student')
                .leftJoinAndSelect('student.person', 'person')
                .leftJoinAndSelect('studentClassrooms.year', 'year')
                .leftJoinAndSelect('studentClassrooms.textGenderGrades', 'textGenderGrades')
                .leftJoinAndSelect('textGenderGrades.textGender', 'textGender')
                .leftJoinAndSelect('textGenderGrades.textGenderExam', 'textGenderExam')
                .leftJoinAndSelect('textGenderGrades.textGenderExamTier', 'textGenderExamTier')
                .leftJoinAndSelect('textGenderGrades.textGenderExamLevel', 'textGenderExamLevel')
                .where('classroom.shortName LIKE :shortName', { shortName: `%${classroomNumber}%` })
                .andWhere('year.id = :yearId', { yearId: year.id })
                .andWhere('textGenderExamLevel.id IS NOT NULL')
                .andWhere('textGender.id = :textGenderId', { textGenderId: textGender === null || textGender === void 0 ? void 0 : textGender.id })
                .orderBy('school.name', 'ASC')
                .getMany();
        });
    }
    filteredSchool(classroomNumber, textGender, year, search) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield data_source_1.AppDataSource.getRepository(School_1.School)
                .createQueryBuilder('school')
                .leftJoinAndSelect('school.classrooms', 'classroom')
                .leftJoinAndSelect('classroom.studentClassrooms', 'studentClassrooms')
                .leftJoinAndSelect('studentClassrooms.student', 'student')
                .leftJoinAndSelect('student.person', 'person')
                .leftJoinAndSelect('studentClassrooms.year', 'year')
                .leftJoinAndSelect('studentClassrooms.textGenderGrades', 'textGenderGrades')
                .leftJoinAndSelect('textGenderGrades.textGender', 'textGender')
                .leftJoinAndSelect('textGenderGrades.textGenderExam', 'textGenderExam')
                .leftJoinAndSelect('textGenderGrades.textGenderExamTier', 'textGenderExamTier')
                .leftJoinAndSelect('textGenderGrades.textGenderExamLevel', 'textGenderExamLevel')
                .where('classroom.shortName LIKE :shortName', { shortName: `%${classroomNumber}%` })
                .andWhere('year.id = :yearId', { yearId: year.id })
                .andWhere('textGenderExamLevel.id IS NOT NULL')
                .andWhere('textGender.id = :textGenderId', { textGenderId: textGender === null || textGender === void 0 ? void 0 : textGender.id })
                .andWhere(new typeorm_1.Brackets(qb => {
                if (search) {
                    qb.where("school.name LIKE :search", { search: `%${search}%` })
                        .orWhere("school.shortName LIKE :search", { search: `%${search}%` });
                }
            }))
                .orderBy('school.name', 'ASC')
                .getMany();
        });
    }
}
exports.textGenderGradeReportController = new TextGenderGradeReportController();

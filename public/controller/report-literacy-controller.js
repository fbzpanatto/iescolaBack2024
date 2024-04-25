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
exports.reportLiteracyController = void 0;
const genericController_1 = require("./genericController");
const School_1 = require("../model/School");
const data_source_1 = require("../data-source");
const LiteracyLevel_1 = require("../model/LiteracyLevel");
const LiteracyTier_1 = require("../model/LiteracyTier");
const Year_1 = require("../model/Year");
const typeorm_1 = require("typeorm");
class ReportLiteracy extends genericController_1.GenericController {
    constructor() {
        super(School_1.School);
    }
    getReport(request) {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            const { classroom, year } = request.params;
            const { search } = request.query;
            try {
                const [literacyLevels, literacyTiers, selectedYear] = yield Promise.all([
                    data_source_1.AppDataSource.getRepository(LiteracyLevel_1.LiteracyLevel).find(),
                    data_source_1.AppDataSource.getRepository(LiteracyTier_1.LiteracyTier).find(),
                    data_source_1.AppDataSource.getRepository(Year_1.Year).findOne({ where: { name: year } })
                ]);
                if (!selectedYear)
                    return { status: 404, message: 'Ano não encontrado.' };
                const allSchools = yield data_source_1.AppDataSource.getRepository(School_1.School)
                    .createQueryBuilder('school')
                    .leftJoinAndSelect('school.classrooms', 'classroom')
                    .leftJoinAndSelect('classroom.studentClassrooms', 'studentClassrooms')
                    .leftJoinAndSelect('studentClassrooms.year', 'year')
                    .leftJoinAndSelect('studentClassrooms.literacies', 'literacies')
                    .leftJoinAndSelect('literacies.literacyLevel', 'literacyLevel')
                    .leftJoinAndSelect('literacies.literacyTier', 'literacyTier')
                    .where('year.id = :yearSearch', { yearSearch: selectedYear.id })
                    .andWhere('classroom.shortName LIKE :classroom', { classroom: `%${classroom}%` })
                    .orderBy('school.name', 'ASC')
                    .getMany();
                const filteredData = yield data_source_1.AppDataSource.getRepository(School_1.School)
                    .createQueryBuilder('school')
                    .leftJoinAndSelect('school.classrooms', 'classroom')
                    .leftJoinAndSelect('classroom.studentClassrooms', 'studentClassrooms')
                    .leftJoinAndSelect('studentClassrooms.year', 'year')
                    .leftJoinAndSelect('studentClassrooms.literacies', 'literacies')
                    .leftJoinAndSelect('literacies.literacyLevel', 'literacyLevel')
                    .leftJoinAndSelect('literacies.literacyTier', 'literacyTier')
                    .where('year.id = :yearSearch', { yearSearch: selectedYear.id })
                    .andWhere('classroom.shortName LIKE :classroom', { classroom: `%${classroom}%` })
                    .andWhere(new typeorm_1.Brackets(qb => {
                    if (search) {
                        qb.where("school.name LIKE :search", { search: `%${search}%` })
                            .orWhere("school.shortName LIKE :search", { search: `%${search}%` });
                    }
                }))
                    .orderBy('school.name', 'ASC')
                    .getMany();
                const cityHall = {
                    id: 'ITA',
                    name: 'PREFEITURA DO MUNICIPIO DE ITATIBA',
                    shortName: 'PREFEITURA DO MUNICIPIO DE ITATIBA',
                    studentsClassrooms: allSchools.flatMap(school => school.classrooms.flatMap(classroom => classroom.studentClassrooms))
                };
                const filteredSchoolArray = filteredData.map(school => ({
                    id: school.id,
                    name: school.name,
                    shortName: school.shortName,
                    studentsClassrooms: school.classrooms.flatMap(classroom => classroom.studentClassrooms)
                }));
                const finalArray = [...filteredSchoolArray, cityHall];
                const resultArray = [];
                for (let school of finalArray) {
                    let localSchool = {
                        id: school.id,
                        name: school.name,
                        tiers: [],
                    };
                    for (let tier of literacyTiers) {
                        let totalPerTier = 0;
                        localSchool.tiers.push({ id: tier.id, name: tier.name, total: totalPerTier, levels: [] });
                        for (let level of literacyLevels) {
                            let totalPerLevel = 0;
                            const localTier = localSchool.tiers.find(tr => tr.id === tier.id);
                            localTier === null || localTier === void 0 ? void 0 : localTier.levels.push({ id: level.id, name: level.name, total: totalPerLevel, rate: 0 });
                            const localLevel = localTier === null || localTier === void 0 ? void 0 : localTier.levels.find(lv => lv.id === level.id);
                            for (let st of school.studentsClassrooms) {
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
                    resultArray.push(localSchool);
                }
                return { status: 200, data: { literacyTiers, literacyLevels, schools: [...filteredSchoolArray, cityHall], classroomNumber: classroom, year: selectedYear.name, resultArray } };
            }
            catch (error) {
                return { status: 500, message: error.message };
            }
        });
    }
}
exports.reportLiteracyController = new ReportLiteracy();

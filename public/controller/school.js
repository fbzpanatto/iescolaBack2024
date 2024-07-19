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
exports.schoolController = void 0;
const genericController_1 = require("./genericController");
const typeorm_1 = require("typeorm");
const School_1 = require("../model/School");
const data_source_1 = require("../data-source");
const Year_1 = require("../model/Year");
class SchoolController extends genericController_1.GenericController {
    constructor() { super(School_1.School); }
    getAllSchools(req) {
        return __awaiter(this, void 0, void 0, function* () {
            const { year } = req.params;
            const { search } = req.query;
            console.log(year, search);
            try {
                return yield data_source_1.AppDataSource.transaction((CONN) => __awaiter(this, void 0, void 0, function* () {
                    const selectedYear = yield CONN.findOne(Year_1.Year, { where: { name: year } });
                    if (!selectedYear)
                        return { status: 404, message: "Ano não encontrado." };
                    const data = yield CONN.getRepository(School_1.School)
                        .createQueryBuilder('school')
                        .leftJoinAndSelect("school.classrooms", "classroom")
                        .leftJoinAndSelect("classroom.studentClassrooms", "studentClassroom")
                        .leftJoinAndSelect("studentClassroom.year", "year")
                        .leftJoin("studentClassroom.student", "student")
                        .where("year.id = :yearSearch", { yearSearch: selectedYear.id })
                        .andWhere(new typeorm_1.Brackets((qb) => {
                        if (search) {
                            qb.where("school.name LIKE :search", { search: `%${search}%` })
                                .orWhere("school.shortName LIKE :search", { search: `%${search}%` });
                        }
                    }))
                        .getMany();
                    const mappedResult = data.map(school => {
                        return {
                            id: school.id,
                            name: school.name,
                            activeStudents: school.classrooms.flatMap(el => el.studentClassrooms.filter(st => st.endedAt === null)).length,
                            inactiveStudents: school.classrooms.flatMap(el => el.studentClassrooms.filter(st => st.endedAt !== null)
                                .reduce((acc, curr) => {
                                const existingStudent = acc.find((existing) => existing.student.id === curr.student.id);
                                if (existingStudent) {
                                    if (curr.endedAt > existingStudent.endedAt) {
                                        return acc.map((existing) => existing.student.id === curr.student.id ? curr : existing);
                                    }
                                    else {
                                        return acc;
                                    }
                                }
                                else {
                                    return [...acc, curr];
                                }
                            }, [])).length
                        };
                    });
                    return { status: 200, data: mappedResult };
                }));
            }
            catch (error) {
                console.log(error);
                return { status: 500, message: error.message };
            }
        });
    }
}
exports.schoolController = new SchoolController();

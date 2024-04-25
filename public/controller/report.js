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
exports.reportController = void 0;
const genericController_1 = require("./genericController");
const typeorm_1 = require("typeorm");
const Test_1 = require("../model/Test");
const data_source_1 = require("../data-source");
const TestQuestion_1 = require("../model/TestQuestion");
const QuestionGroup_1 = require("../model/QuestionGroup");
const School_1 = require("../model/School");
const personCategories_1 = require("../utils/personCategories");
class ReportController extends genericController_1.GenericController {
    constructor() {
        super(Test_1.Test);
    }
    getSchoolAvg(request) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const response = (yield this.getReport(request)).data;
                if (!response)
                    return { status: 404, message: "Teste não encontrado" };
                const schools = response.schools;
                const schoolAvg = schools.map(school => (Object.assign(Object.assign({}, school), { qRate: school.qRate
                        .reduce((acc, curr) => (curr.rate === 'N/A' ? acc : acc + Number(curr.rate)), 0) /
                        school.qRate.filter(q => q.rate !== 'N/A').length })));
                return { status: 200, data: Object.assign(Object.assign({}, response), { schoolAvg }) };
            }
            catch (error) {
                return { status: 500, message: error.message };
            }
        });
    }
    getReport(request) {
        return __awaiter(this, void 0, void 0, function* () {
            const yearName = request === null || request === void 0 ? void 0 : request.params.year;
            const testId = request === null || request === void 0 ? void 0 : request.params.id;
            try {
                const testQuestions = yield this.getTestQuestions(Number(testId));
                if (!testQuestions)
                    return { status: 404, message: "Questões não encontradas" };
                const testQuestionsIds = testQuestions.map(testQuestion => testQuestion.id);
                const questionGroups = yield this.getTestQuestionsGroups(Number(testId));
                const test = yield data_source_1.AppDataSource.getRepository(Test_1.Test)
                    .createQueryBuilder("test")
                    .leftJoinAndSelect("test.period", "period")
                    .leftJoinAndSelect("period.bimester", "periodBimester")
                    .leftJoinAndSelect("period.year", "periodYear")
                    .leftJoinAndSelect("test.discipline", "discipline")
                    .leftJoinAndSelect("test.category", "category")
                    .leftJoinAndSelect("test.person", "testPerson")
                    .where("test.id = :testId", { testId })
                    .andWhere("periodYear.name = :yearName", { yearName })
                    .getOne();
                if (!test)
                    return { status: 404, message: "Teste não encontrado" };
                const schools = yield data_source_1.AppDataSource.getRepository(School_1.School)
                    .createQueryBuilder("school")
                    .leftJoinAndSelect("school.classrooms", "classroom")
                    .leftJoinAndSelect("classroom.studentClassrooms", "studentClassroom")
                    .leftJoinAndSelect("studentClassroom.studentStatus", "studentStatus")
                    .leftJoinAndSelect("studentStatus.test", "studentStatusTest")
                    .leftJoinAndSelect("studentClassroom.studentQuestions", "studentQuestions")
                    .leftJoinAndSelect("studentQuestions.testQuestion", "testQuestion", "testQuestion.id IN (:...testQuestions)", { testQuestions: testQuestionsIds })
                    .leftJoin("testQuestion.test", "test")
                    .leftJoin("studentClassroom.year", "year")
                    .where("year.name = :yearName", { yearName })
                    .andWhere("test.id = :testId", { testId })
                    .andWhere("studentStatusTest.id = :testId", { testId })
                    .andWhere(new typeorm_1.Brackets(qb => {
                    qb.where("studentClassroom.startedAt < :testCreatedAt", { testCreatedAt: test.createdAt });
                    qb.orWhere("studentQuestions.id IS NOT NULL");
                }))
                    .getMany();
                const simplifiedSchools = schools.map(school => (Object.assign(Object.assign({}, school), { studentClassrooms: school.classrooms.flatMap(classroom => classroom.studentClassrooms.map(studentClassroom => (Object.assign(Object.assign({}, studentClassroom), { studentQuestions: studentClassroom.studentQuestions.map(studentQuestion => {
                            const testQuestion = testQuestions.find(tq => tq.id === studentQuestion.testQuestion.id);
                            const score = (studentQuestion.answer.length === 0) ? 0 : ((testQuestion === null || testQuestion === void 0 ? void 0 : testQuestion.answer.includes(studentQuestion.answer.toUpperCase())) ? 1 : 0);
                            return Object.assign(Object.assign({}, studentQuestion), { score });
                        }) })))) })));
                const simplifiedArray = simplifiedSchools.map(school => {
                    const { id, name, shortName } = school;
                    const qRate = testQuestions.map(testQuestion => {
                        if (!testQuestion.active) {
                            return { id: testQuestion.id, rate: 'N/A' };
                        }
                        let sum = 0;
                        let count = 0;
                        school.studentClassrooms
                            .filter(studentClassroom => { var _a; return (_a = studentClassroom.studentStatus.find(register => register.test.id === test.id)) === null || _a === void 0 ? void 0 : _a.active; })
                            .flatMap(studentClassroom => studentClassroom.studentQuestions)
                            .filter(studentQuestion => studentQuestion.testQuestion.id === testQuestion.id)
                            .forEach(studentQuestion => {
                            const studentQuestionAny = studentQuestion;
                            sum += studentQuestionAny.score;
                            count += 1;
                        });
                        const rate = count === 0 ? 0 : (sum / count) * 100;
                        return { id: testQuestion.id, rate };
                    });
                    return { id, name, shortName, qRate };
                });
                simplifiedArray.sort((a, b) => {
                    const totalA = a.qRate.reduce((acc, curr) => (curr.rate === 'N/A' ? acc : acc + Number(curr.rate)), 0);
                    const totalB = b.qRate.reduce((acc, curr) => (curr.rate === 'N/A' ? acc : acc + Number(curr.rate)), 0);
                    return totalB - totalA;
                });
                let response = Object.assign(Object.assign({}, test), { testQuestions, questionGroups, schools: simplifiedArray });
                return { status: 200, data: response };
            }
            catch (error) {
                return { status: 500, message: error.message };
            }
        });
    }
    getTestQuestions(testId) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield data_source_1.AppDataSource.getRepository(TestQuestion_1.TestQuestion)
                .createQueryBuilder("testQuestion")
                .leftJoinAndSelect("testQuestion.question", "question")
                .leftJoinAndSelect("testQuestion.questionGroup", "questionGroup")
                .leftJoin("testQuestion.test", "test")
                .where("testQuestion.test = :testId", { testId })
                .orderBy("questionGroup.id", "ASC")
                .addOrderBy("testQuestion.order", "ASC")
                .getMany();
        });
    }
    getTestQuestionsGroups(testId) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield data_source_1.AppDataSource.getRepository(QuestionGroup_1.QuestionGroup)
                .createQueryBuilder("questionGroup")
                .select(["questionGroup.id AS id", "questionGroup.name AS name"])
                .addSelect("COUNT(testQuestions.id)", "questionsCount")
                .leftJoin("questionGroup.testQuestions", "testQuestions")
                .where("testQuestions.test = :testId", { testId })
                .groupBy("questionGroup.id")
                .getRawMany();
        });
    }
    findAllWhere(options, request) {
        return __awaiter(this, void 0, void 0, function* () {
            const yearName = request === null || request === void 0 ? void 0 : request.params.year;
            const search = request === null || request === void 0 ? void 0 : request.query.search;
            try {
                const teacher = yield this.teacherByUser(request === null || request === void 0 ? void 0 : request.body.user.user);
                const teacherClasses = yield this.teacherClassrooms(request === null || request === void 0 ? void 0 : request.body.user);
                const isAdminSupervisor = teacher.person.category.id === personCategories_1.personCategories.ADMINISTRADOR || teacher.person.category.id === personCategories_1.personCategories.SUPERVISOR;
                const testClasses = yield data_source_1.AppDataSource.getRepository(Test_1.Test)
                    .createQueryBuilder("test")
                    .leftJoinAndSelect("test.person", "person")
                    .leftJoinAndSelect("test.period", "period")
                    .leftJoinAndSelect("period.bimester", "bimester")
                    .leftJoinAndSelect("period.year", "year")
                    .leftJoinAndSelect("test.category", "category")
                    .leftJoinAndSelect("test.discipline", "discipline")
                    .leftJoinAndSelect("test.classrooms", "classroom")
                    .leftJoinAndSelect("classroom.school", "school")
                    .where(new typeorm_1.Brackets(qb => {
                    if (!isAdminSupervisor) {
                        qb.where("classroom.id IN (:...teacherClasses)", { teacherClasses: teacherClasses.classrooms });
                    }
                }))
                    .andWhere("year.name = :yearName", { yearName })
                    .andWhere("test.name LIKE :search", { search: `%${search}%` })
                    .getMany();
                return { status: 200, data: testClasses };
            }
            catch (error) {
                return { status: 500, message: error.message };
            }
        });
    }
}
exports.reportController = new ReportController();

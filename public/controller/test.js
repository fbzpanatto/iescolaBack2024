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
exports.testController = void 0;
const genericController_1 = require("./genericController");
const Test_1 = require("../model/Test");
const classroom_1 = require("./classroom");
const data_source_1 = require("../data-source");
const Period_1 = require("../model/Period");
const Classroom_1 = require("../model/Classroom");
const StudentClassroom_1 = require("../model/StudentClassroom");
const TestQuestion_1 = require("../model/TestQuestion");
const QuestionGroup_1 = require("../model/QuestionGroup");
const StudentQuestion_1 = require("../model/StudentQuestion");
const StudentTestStatus_1 = require("../model/StudentTestStatus");
const personCategories_1 = require("../utils/personCategories");
const Year_1 = require("../model/Year");
const typeorm_1 = require("typeorm");
const Question_1 = require("../model/Question");
const Descriptor_1 = require("../model/Descriptor");
const Topic_1 = require("../model/Topic");
const ClassroomCategory_1 = require("../model/ClassroomCategory");
const Discipline_1 = require("../model/Discipline");
const Bimester_1 = require("../model/Bimester");
const TestCategory_1 = require("../model/TestCategory");
class TestController extends genericController_1.GenericController {
    constructor() {
        super(Test_1.Test);
        this.diffs = (original, current) => {
            if (original === current)
                return false;
            if (typeof original !== 'object' || original === null || current === null)
                return original !== current;
            const originalKeys = Object.keys(original);
            const currentKeys = Object.keys(current);
            if (originalKeys.length !== currentKeys.length)
                return true;
            for (let key of originalKeys) {
                if (!currentKeys.includes(key))
                    return true;
                if (this.diffs(original[key], current[key])) {
                    return true;
                }
            }
            return false;
        };
    }
    getFormData(req) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                return yield data_source_1.AppDataSource.transaction((CONN) => __awaiter(this, void 0, void 0, function* () {
                    const classrooms = (yield classroom_1.classroomController.getAllClassrooms(req, false, CONN)).data;
                    const disciplines = yield CONN.find(Discipline_1.Discipline);
                    const bimesters = yield CONN.find(Bimester_1.Bimester);
                    const testCategories = yield CONN.find(TestCategory_1.TestCategory);
                    const questionGroup = yield CONN.findOneBy(QuestionGroup_1.QuestionGroup, { id: 1 });
                    return { status: 200, data: { classrooms, disciplines, bimesters, testCategories, questionGroup } };
                }));
            }
            catch (error) {
                return { status: 500, message: error.message };
            }
        });
    }
    getGraphic(req) {
        return __awaiter(this, void 0, void 0, function* () {
            const { id: testId, classroom: classroomId } = req.params;
            const { year: yearId } = req.query;
            try {
                return yield data_source_1.AppDataSource.transaction((CONN) => __awaiter(this, void 0, void 0, function* () {
                    const teacher = yield this.teacherByUser(req.body.user.user, CONN);
                    const masterUser = teacher.person.category.id === personCategories_1.pc.ADMN || teacher.person.category.id === personCategories_1.pc.SUPE || teacher.person.category.id === personCategories_1.pc.FORM;
                    const { classrooms } = yield this.teacherClassrooms(req.body.user, CONN);
                    if (!classrooms.includes(Number(classroomId)) && !masterUser)
                        return { status: 403, message: "Você não tem permissão para acessar essa sala." };
                    const classroom = yield CONN.findOne(Classroom_1.Classroom, { where: { id: Number(classroomId) }, relations: ["school"] });
                    if (!classroom)
                        return { status: 404, message: "Sala não encontrada" };
                    const testQuestions = yield this.getTestQuestions(parseInt(testId), CONN);
                    if (!testQuestions)
                        return { status: 404, message: "Questões não encontradas" };
                    const testQuestionsIds = testQuestions.map(testQuestion => testQuestion.id);
                    const questionGroups = yield this.getTestQuestionsGroups(Number(testId), CONN);
                    const test = yield CONN.getRepository(Test_1.Test)
                        .createQueryBuilder("test")
                        .leftJoinAndSelect("test.period", "period")
                        .leftJoinAndSelect("period.bimester", "periodBimester")
                        .leftJoinAndSelect("period.year", "periodYear")
                        .leftJoinAndSelect("test.discipline", "discipline")
                        .leftJoinAndSelect("test.category", "category")
                        .leftJoinAndSelect("test.person", "testPerson")
                        .leftJoinAndSelect("test.classrooms", "classroom")
                        .leftJoinAndSelect("classroom.school", "school")
                        .leftJoinAndSelect("classroom.studentClassrooms", "studentClassroom")
                        .leftJoinAndSelect("studentClassroom.studentStatus", "studentStatus")
                        .leftJoinAndSelect("studentStatus.test", "studentStatusTest")
                        .leftJoinAndSelect("studentClassroom.student", "student")
                        .leftJoinAndSelect("studentClassroom.studentQuestions", "studentQuestions")
                        .leftJoinAndSelect("studentQuestions.testQuestion", "testQuestion", "testQuestion.id IN (:...testQuestions)", { testQuestions: testQuestionsIds })
                        .leftJoinAndSelect("testQuestion.questionGroup", "questionGroup")
                        .leftJoinAndSelect("student.person", "studentPerson")
                        .leftJoin("studentClassroom.year", "studentClassroomYear")
                        .where("test.id = :testId", { testId })
                        .andWhere("periodYear.id = :yearId", { yearId })
                        .andWhere("studentClassroomYear.id = :yearId", { yearId })
                        .andWhere("testQuestion.test = :testId", { testId })
                        .andWhere("studentStatusTest.id = :testId", { testId })
                        .orderBy("questionGroup.id", "ASC")
                        .addOrderBy("testQuestion.order", "ASC")
                        .addOrderBy("studentClassroom.rosterNumber", "ASC")
                        .addOrderBy("classroom.shortName", "ASC")
                        .getOne();
                    if (!test)
                        return { status: 404, message: "Teste não encontrado" };
                    let response = Object.assign(Object.assign({}, test), { testQuestions, questionGroups });
                    const allClasses = response.classrooms;
                    allClasses.map((classroom) => {
                        classroom.studentClassrooms = classroom.studentClassrooms.map((studentClassroom) => {
                            studentClassroom.studentQuestions = studentClassroom.studentQuestions.map((studentQuestion) => {
                                const testQuestion = testQuestions.find((testQuestion) => testQuestion.id === studentQuestion.testQuestion.id);
                                if (studentQuestion.answer.length === 0)
                                    return (Object.assign(Object.assign({}, studentQuestion), { score: 0 }));
                                const score = (testQuestion === null || testQuestion === void 0 ? void 0 : testQuestion.answer.includes(studentQuestion.answer.toUpperCase())) ? 1 : 0;
                                return Object.assign(Object.assign({}, studentQuestion), { score });
                            });
                            return studentClassroom;
                        });
                        return classroom;
                    });
                    const filteredClasses = allClasses.filter(el => el.school.id === classroom.school.id);
                    const cityHall = { id: 'ITA', name: 'PREFEITURA DO MUNICIPIO DE ITATIBA', shortName: 'ITA', school: { id: 99, name: 'PREFEITURA DO MUNICIPIO DE ITATIBA', shortName: 'ITATIBA', inep: null, active: true }, studentClassrooms: allClasses.flatMap(cl => cl.studentClassrooms) };
                    response.classrooms = [...filteredClasses, cityHall];
                    const newReturn = Object.assign(Object.assign({}, response), { classrooms: response.classrooms.map((classroom) => { return Object.assign(Object.assign({}, classroom), { studentClassrooms: classroom.studentClassrooms.map((studentClassroom) => { return Object.assign(Object.assign({}, studentClassroom), { studentStatus: studentClassroom.studentStatus.find(studentStatus => studentStatus.test.id === test.id) }); }) }); }) });
                    return { status: 200, data: newReturn };
                }));
            }
            catch (error) {
                return { status: 500, message: error.message };
            }
        });
    }
    getStudents(request) {
        return __awaiter(this, void 0, void 0, function* () {
            const testId = parseInt(request === null || request === void 0 ? void 0 : request.params.id);
            const classroomId = parseInt(request === null || request === void 0 ? void 0 : request.params.classroom);
            const yearName = request === null || request === void 0 ? void 0 : request.params.year;
            try {
                return yield data_source_1.AppDataSource.transaction((CONN) => __awaiter(this, void 0, void 0, function* () {
                    const uTeacher = yield this.teacherByUser(request === null || request === void 0 ? void 0 : request.body.user.user, CONN);
                    const masterUser = uTeacher.person.category.id === personCategories_1.pc.ADMN || uTeacher.person.category.id === personCategories_1.pc.SUPE || uTeacher.person.category.id === personCategories_1.pc.FORM;
                    const { classrooms } = yield this.teacherClassrooms(request === null || request === void 0 ? void 0 : request.body.user, CONN);
                    const message = "Você não tem permissão para acessar essa sala.";
                    if (!classrooms.includes(classroomId) && !masterUser) {
                        return { status: 403, message };
                    }
                    const test = yield this.getTest(testId, yearName, CONN);
                    if (!test)
                        return { status: 404, message: "Teste não encontrado" };
                    const questionGroups = yield this.getTestQuestionsGroups(testId, CONN);
                    const fields = ["testQuestion.id", "testQuestion.order", "testQuestion.answer", "testQuestion.active", "question.id", "classroomCategory.id", "classroomCategory.name", "questionGroup.id", "questionGroup.name"];
                    const testQuestions = yield this.getTestQuestions(test.id, CONN, fields);
                    const classroom = yield CONN.getRepository(Classroom_1.Classroom)
                        .createQueryBuilder("classroom")
                        .leftJoinAndSelect("classroom.school", "school")
                        .where("classroom.id = :classroomId", { classroomId })
                        .getOne();
                    const studentClassrooms = yield this.studentClassrooms(test, Number(classroomId), yearName, CONN);
                    yield this.createLink(studentClassrooms, test, testQuestions, uTeacher.person.user.id, CONN);
                    const studentClassroomsWithQuestions = yield this.setQuestionsForStudent(test, testQuestions, Number(classroomId), yearName, CONN);
                    let data = { test, classroom, testQuestions, studentClassrooms: studentClassroomsWithQuestions, questionGroups };
                    return { status: 200, data };
                }));
            }
            catch (error) {
                return { status: 500, message: error.message };
            }
        });
    }
    setQuestionsForStudent(test, testQuestions, classroomId, yearName, CONN) {
        return __awaiter(this, void 0, void 0, function* () {
            const testQuestionsIds = testQuestions.map(testQuestion => testQuestion.id);
            const preResult = yield CONN.getRepository(StudentClassroom_1.StudentClassroom)
                .createQueryBuilder("studentClassroom")
                .leftJoinAndSelect("studentClassroom.student", "student")
                .leftJoinAndSelect("studentClassroom.studentStatus", "studentStatus")
                .leftJoinAndSelect("studentStatus.test", "stStatusTest")
                .leftJoin("studentClassroom.year", "year")
                .leftJoinAndSelect("student.person", "person")
                .leftJoinAndSelect("studentClassroom.classroom", "classroom")
                .leftJoinAndSelect("studentClassroom.studentQuestions", "studentQuestions")
                .leftJoinAndSelect("studentQuestions.testQuestion", "testQuestion", "testQuestion.id IN (:...testQuestions)", { testQuestions: testQuestionsIds })
                .leftJoinAndSelect("testQuestion.questionGroup", "questionGroup")
                .leftJoin("testQuestion.test", "test")
                .where("studentClassroom.classroom = :classroomId", { classroomId })
                .andWhere(new typeorm_1.Brackets(qb => {
                qb.where("studentClassroom.startedAt < :testCreatedAt", { testCreatedAt: test.createdAt });
                qb.orWhere("studentQuestions.id IS NOT NULL");
            }))
                .andWhere("testQuestion.test = :testId", { testId: test.id })
                .andWhere("stStatusTest.id = :testId", { testId: test.id })
                .andWhere("year.name = :yearName", { yearName })
                .orderBy("questionGroup.id", "ASC")
                .addOrderBy("testQuestion.order", "ASC")
                .addOrderBy("studentClassroom.rosterNumber", "ASC")
                .getMany();
            return preResult.map(studentClassroom => {
                const studentQuestions = studentClassroom.studentQuestions.map(studentQuestion => {
                    const testQuestion = testQuestions.find(testQuestion => testQuestion.id === studentQuestion.testQuestion.id);
                    if (studentQuestion.answer.length === 0)
                        return (Object.assign(Object.assign({}, studentQuestion), { score: 0 }));
                    const score = (testQuestion === null || testQuestion === void 0 ? void 0 : testQuestion.answer.includes(studentQuestion.answer.toUpperCase())) ? 1 : 0;
                    return Object.assign(Object.assign({}, studentQuestion), { score });
                });
                return Object.assign(Object.assign({}, studentClassroom), { studentStatus: studentClassroom.studentStatus.find(studentStatus => studentStatus.test.id === test.id), studentQuestions });
            });
        });
    }
    studentClassrooms(test, classroomId, yearName, CONN) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield CONN.getRepository(StudentClassroom_1.StudentClassroom)
                .createQueryBuilder("studentClassroom")
                .leftJoin("studentClassroom.year", "year")
                .leftJoin("studentClassroom.studentQuestions", "studentQuestions")
                .leftJoin("studentClassroom.studentStatus", "studentStatus")
                .leftJoin("studentStatus.test", "test", "test.id = :testId", { testId: test.id })
                .leftJoin("studentClassroom.student", "student")
                .leftJoin("student.person", "person")
                .where("studentClassroom.classroom = :classroomId", { classroomId })
                .andWhere(new typeorm_1.Brackets(qb => {
                qb.where("studentClassroom.startedAt < :testCreatedAt", { testCreatedAt: test.createdAt });
                qb.orWhere("studentQuestions.id IS NOT NULL");
            }))
                .andWhere("year.name = :yearName", { yearName })
                .getMany();
        });
    }
    getTestQuestionsGroups(testId, CONN) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield CONN.getRepository(QuestionGroup_1.QuestionGroup)
                .createQueryBuilder("questionGroup")
                .select(["questionGroup.id AS id", "questionGroup.name AS name"])
                .addSelect("COUNT(testQuestions.id)", "questionsCount")
                .leftJoin("questionGroup.testQuestions", "testQuestions")
                .where("testQuestions.test = :testId", { testId })
                .groupBy("questionGroup.id")
                .getRawMany();
        });
    }
    getAllToInsert(request) {
        return __awaiter(this, void 0, void 0, function* () {
            const testId = request === null || request === void 0 ? void 0 : request.params.id;
            const classroomId = request === null || request === void 0 ? void 0 : request.params.classroom;
            const yearName = request.params.year;
            try {
                return yield data_source_1.AppDataSource.transaction((CONN) => __awaiter(this, void 0, void 0, function* () {
                    const test = yield this.getTest(Number(testId), Number(yearName), CONN);
                    if (!test)
                        return { status: 404, message: "Teste não encontrado" };
                    const response = yield this.notIncluded(test, Number(classroomId), Number(yearName), CONN);
                    return { status: 200, data: response };
                }));
            }
            catch (error) {
                return { status: 500, message: error.message };
            }
        });
    }
    createLink(studentClassrooms, test, testQuestions, userId, CONN) {
        return __awaiter(this, void 0, void 0, function* () {
            for (let studentClassroom of studentClassrooms) {
                const options = { where: { test: { id: test.id }, studentClassroom: { id: studentClassroom.id } } };
                const stStatus = yield CONN.findOne(StudentTestStatus_1.StudentTestStatus, options);
                const el = { active: true, test, studentClassroom, observation: '', createdAt: new Date(), createdByUser: userId };
                if (!stStatus) {
                    yield CONN.save(StudentTestStatus_1.StudentTestStatus, el);
                }
                for (let testQuestion of testQuestions) {
                    const options = { where: { testQuestion: { id: testQuestion.id, test: { id: test.id }, question: { id: testQuestion.question.id } }, studentClassroom: { id: studentClassroom.id } } };
                    const sQuestion = yield CONN.findOne(StudentQuestion_1.StudentQuestion, options);
                    if (!sQuestion) {
                        yield CONN.save(StudentQuestion_1.StudentQuestion, { answer: '', testQuestion: testQuestion, studentClassroom: studentClassroom, createdAt: new Date(), createdByUser: userId });
                    }
                }
            }
        });
    }
    insertStudents(req) {
        return __awaiter(this, void 0, void 0, function* () {
            const body = req.body;
            try {
                return yield data_source_1.AppDataSource.transaction((CONN) => __awaiter(this, void 0, void 0, function* () {
                    const uTeacher = yield this.teacherByUser(body.user.user, CONN);
                    const test = yield this.getTest(body.test.id, body.year, CONN);
                    if (!test)
                        return { status: 404, message: "Teste não encontrado" };
                    const stClassrooms = yield this.notIncluded(test, body.classroom.id, body.year, CONN);
                    if (!stClassrooms || stClassrooms.length < 1)
                        return { status: 404, message: "Alunos não encontrados" };
                    const testQuestions = yield this.getTestQuestions(test.id, CONN);
                    const filteredSC = stClassrooms.filter(studentClassroom => body.studentClassrooms.includes(studentClassroom.id));
                    yield this.createLink(filteredSC, test, testQuestions, uTeacher.person.user.id, CONN);
                    return { status: 200, data: {} };
                }));
            }
            catch (error) {
                return { status: 500, message: error.message };
            }
        });
    }
    notIncluded(test, classroomId, yearName, CONN) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield CONN.getRepository(StudentClassroom_1.StudentClassroom)
                .createQueryBuilder("studentClassroom")
                .select(['studentClassroom.id AS id', 'studentClassroom.rosterNumber AS rosterNumber', 'studentClassroom.startedAt AS startedAt', 'studentClassroom.endedAt AS endedAt', 'person.name AS name', 'student.ra AS ra', 'student.dv AS dv'])
                .leftJoin("studentClassroom.year", "year")
                .leftJoin("studentClassroom.studentQuestions", "studentQuestions")
                .leftJoin("studentClassroom.studentStatus", "studentStatus")
                .leftJoin("studentStatus.test", "test", "test.id = :testId", { testId: test.id })
                .leftJoin("studentClassroom.student", "student")
                .leftJoin("student.person", "person")
                .where("studentClassroom.classroom = :classroomId", { classroomId })
                .andWhere("studentClassroom.startedAt > :testCreatedAt", { testCreatedAt: test.createdAt })
                .andWhere("studentClassroom.endedAt IS NULL")
                .andWhere("year.name = :yearName", { yearName })
                .andWhere("studentQuestions.id IS NULL")
                .getRawMany();
        });
    }
    findAllByYear(request) {
        return __awaiter(this, void 0, void 0, function* () {
            const yearName = request.params.year;
            const search = request.query.search;
            const userBody = request.body.user;
            try {
                return data_source_1.AppDataSource.transaction((CONN) => __awaiter(this, void 0, void 0, function* () {
                    const { classrooms } = yield this.teacherClassrooms(request === null || request === void 0 ? void 0 : request.body.user, CONN);
                    const testClasses = yield CONN.getRepository(Test_1.Test)
                        .createQueryBuilder("test")
                        .leftJoinAndSelect("test.person", "person")
                        .leftJoinAndSelect("test.period", "period")
                        .leftJoinAndSelect("test.category", "category")
                        .leftJoinAndSelect("period.year", "year")
                        .leftJoinAndSelect("period.bimester", "bimester")
                        .leftJoinAndSelect("test.discipline", "discipline")
                        .leftJoinAndSelect("test.classrooms", "classroom")
                        .leftJoinAndSelect("classroom.school", "school")
                        .where(new typeorm_1.Brackets(qb => { if (userBody.category != personCategories_1.pc.ADMN && userBody.category != personCategories_1.pc.SUPE) {
                        qb.where("classroom.id IN (:...teacherClasses)", { teacherClasses: classrooms });
                    } }))
                        .andWhere("year.name = :yearName", { yearName })
                        .andWhere("test.name LIKE :search", { search: `%${search}%` })
                        .getMany();
                    return { status: 200, data: testClasses };
                }));
            }
            catch (error) {
                return { status: 500, message: error.message };
            }
        });
    }
    getById(req) {
        return __awaiter(this, void 0, void 0, function* () {
            const { id } = req.params;
            try {
                return yield data_source_1.AppDataSource.transaction((CONN) => __awaiter(this, void 0, void 0, function* () {
                    const teacher = yield this.teacherByUser(req.body.user.user, CONN);
                    const masterUser = teacher.person.category.id === personCategories_1.pc.ADMN || teacher.person.category.id === personCategories_1.pc.SUPE || teacher.person.category.id === personCategories_1.pc.FORM;
                    const op = { relations: ["period", "period.year", "period.bimester", "discipline", "category", "person", "classrooms.school"], where: { id: parseInt(id) } };
                    const test = yield CONN.findOne(Test_1.Test, Object.assign({}, op));
                    if (teacher.person.id !== (test === null || test === void 0 ? void 0 : test.person.id) && !masterUser)
                        return { status: 403, message: "Você não tem permissão para editar esse teste." };
                    if (!test) {
                        return { status: 404, message: 'Data not found' };
                    }
                    const testQuestions = yield this.getTestQuestions(test.id, CONN);
                    return { status: 200, data: Object.assign(Object.assign({}, test), { testQuestions }) };
                }));
            }
            catch (error) {
                return { status: 500, message: error.message };
            }
        });
    }
    saveTest(body) {
        return __awaiter(this, void 0, void 0, function* () {
            const classesIds = body.classroom.map((classroom) => classroom.id);
            try {
                return yield data_source_1.AppDataSource.transaction((CONN) => __awaiter(this, void 0, void 0, function* () {
                    const uTeacher = yield this.teacherByUser(body.user.user, CONN);
                    if (!uTeacher)
                        return { status: 404, message: "Usuário inexistente" };
                    const checkYear = yield CONN.findOne(Year_1.Year, { where: { id: body.year.id } });
                    if (!checkYear)
                        return { status: 404, message: "Ano não encontrado" };
                    if (!checkYear.active)
                        return { status: 400, message: "Não é possível criar um teste para um ano letivo inativo." };
                    const period = yield CONN.findOne(Period_1.Period, {
                        relations: ["year", "bimester"], where: { year: body.year, bimester: body.bimester }
                    });
                    if (!period)
                        return { status: 404, message: "Período não encontrado" };
                    const classes = yield CONN.getRepository(Classroom_1.Classroom)
                        .createQueryBuilder("classroom")
                        .select(["classroom.id", "classroom.name", "classroom.shortName"])
                        .leftJoinAndSelect("classroom.studentClassrooms", "studentClassroom")
                        .leftJoinAndSelect("studentClassroom.student", "student")
                        .leftJoinAndSelect("student.person", "person")
                        .leftJoinAndSelect("classroom.school", "school")
                        .leftJoin('studentClassroom.year', 'year')
                        .where("classroom.id IN (:...classesIds)", { classesIds })
                        .andWhere('year.id = :yearId', { yearId: period.year.id })
                        .andWhere("studentClassroom.startedAt < :testCreatedAt", { testCreatedAt: new Date() })
                        .andWhere('studentClassroom.endedAt IS NULL')
                        .groupBy("classroom.id, studentClassroom.id")
                        .having("COUNT(studentClassroom.id) > 0")
                        .getMany();
                    if (!classes || classes.length < 1)
                        return { status: 400, message: "Não existem alunos matriculados em uma ou mais salas informadas." };
                    const test = new Test_1.Test();
                    test.name = body.name;
                    test.category = body.category;
                    test.discipline = body.discipline;
                    test.person = uTeacher.person;
                    test.period = period;
                    test.classrooms = classes;
                    test.createdAt = new Date();
                    test.createdByUser = uTeacher.person.user.id;
                    yield CONN.save(Test_1.Test, test);
                    const tQts = body.testQuestions.map((el) => (Object.assign(Object.assign({}, el), { createdAt: new Date(), createdByUser: uTeacher.person.user.id, question: Object.assign(Object.assign({}, el.question), { person: el.question.person || uTeacher.person, createdAt: new Date(), createdByUser: uTeacher.person.user.id }), test: test })));
                    yield CONN.save(TestQuestion_1.TestQuestion, tQts);
                    return { status: 201, data: test };
                }));
            }
            catch (error) {
                console.log('error', error);
                return { status: 500, message: error.message };
            }
        });
    }
    updateTest(id, req) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                return yield data_source_1.AppDataSource.transaction((CONN) => __awaiter(this, void 0, void 0, function* () {
                    const uTeacher = yield this.teacherByUser(req.body.user.user, CONN);
                    const userId = uTeacher.person.user.id;
                    const masterUser = uTeacher.person.category.id === personCategories_1.pc.ADMN || uTeacher.person.category.id === personCategories_1.pc.SUPE || uTeacher.person.category.id === personCategories_1.pc.FORM;
                    const test = yield CONN.findOne(Test_1.Test, { relations: ["person"], where: { id: Number(id) } });
                    if (!test)
                        return { status: 404, message: "Teste não encontrado" };
                    if (uTeacher.person.id !== test.person.id && !masterUser)
                        return { status: 403, message: "Você não tem permissão para editar esse teste." };
                    test.name = req.body.name;
                    test.updatedAt = new Date();
                    test.updatedByUser = userId;
                    yield CONN.save(Test_1.Test, test);
                    const bodyTq = req.body.testQuestions;
                    const dataTq = yield this.getTestQuestions(test.id, CONN);
                    for (let next of bodyTq) {
                        const curr = dataTq.find(el => el.id === next.id);
                        if (!curr) {
                            yield CONN.save(TestQuestion_1.TestQuestion, Object.assign(Object.assign({}, next), { createdAt: new Date(), createdByUser: userId, question: Object.assign(Object.assign({}, next.question), { person: next.question.person || uTeacher.person, createdAt: new Date(), createdByUser: userId }), test }));
                        }
                        else {
                            const testQuestionCondition = this.diffs(curr, next);
                            if (testQuestionCondition) {
                                yield CONN.save(TestQuestion_1.TestQuestion, Object.assign(Object.assign({}, next), { createdAt: curr.createdAt, createdByUser: curr.createdByUser, updatedAt: new Date(), updatedByUser: userId }));
                            }
                            if (this.diffs(curr.question, next.question)) {
                                yield CONN.save(Question_1.Question, Object.assign(Object.assign({}, next.question), { createdAt: curr.question.createdAt, createdByUser: curr.question.createdByUser, updatedAt: new Date(), updatedByUser: userId }));
                            }
                            if (this.diffs(curr.question.descriptor, next.question.descriptor)) {
                                yield CONN.save(Descriptor_1.Descriptor, Object.assign(Object.assign({}, next.question.descriptor), { createdAt: curr.question.descriptor.createdAt, createdByUser: curr.question.descriptor.createdByUser, updatedAt: new Date(), updatedByUser: userId }));
                            }
                            if (this.diffs(curr.question.descriptor.topic, next.question.descriptor.topic)) {
                                yield CONN.save(Topic_1.Topic, Object.assign(Object.assign({}, next.question.descriptor.topic), { createdAt: curr.question.descriptor.topic.createdAt, createdByUser: curr.question.descriptor.topic.createdByUser, updatedAt: new Date(), updatedByUser: userId }));
                            }
                            if (this.diffs(curr.question.descriptor.topic.classroomCategory, next.question.descriptor.topic.classroomCategory)) {
                                yield CONN.save(ClassroomCategory_1.ClassroomCategory, Object.assign(Object.assign({}, next.question.descriptor.topic.classroomCategory), { createdAt: curr.question.descriptor.topic.classroomCategory.createdAt, createdByUser: curr.question.descriptor.topic.classroomCategory.createdByUser, updatedAt: new Date(), updatedByUser: userId }));
                            }
                            if (this.diffs(curr.questionGroup, next.questionGroup)) {
                                yield CONN.save(QuestionGroup_1.QuestionGroup, Object.assign(Object.assign({}, next.questionGroup), { createdAt: curr.questionGroup.createdAt, createdByUser: curr.questionGroup.createdByUser, updatedAt: new Date(), updatedByUser: userId }));
                            }
                        }
                    }
                    const result = (yield this.findOneById(id, req, CONN)).data;
                    return { status: 200, data: result };
                }));
            }
            catch (error) {
                return { status: 500, message: error.message };
            }
        });
    }
    getTest(testId, yearName, CONN) {
        return __awaiter(this, void 0, void 0, function* () {
            return CONN.getRepository(Test_1.Test)
                .createQueryBuilder("test")
                .leftJoinAndSelect("test.person", "person")
                .leftJoinAndSelect("test.period", "period")
                .leftJoinAndSelect("period.bimester", "bimester")
                .leftJoinAndSelect("period.year", "year")
                .leftJoinAndSelect("test.discipline", "discipline")
                .leftJoinAndSelect("test.category", "category")
                .where("test.id = :testId", { testId })
                .andWhere("year.name = :yearName", { yearName })
                .getOne();
        });
    }
    getTestQuestions(testId, CONN, selectFields) {
        return __awaiter(this, void 0, void 0, function* () {
            const fields = ["testQuestion.id", "testQuestion.order", "testQuestion.answer", "testQuestion.active", "question.id", "question.title", "person.id", "question.person", "descriptor.id", "descriptor.code", "descriptor.name", "topic.id", "topic.name", "topic.description", "classroomCategory.id", "classroomCategory.name", "questionGroup.id", "questionGroup.name"];
            return yield CONN.getRepository(TestQuestion_1.TestQuestion)
                .createQueryBuilder("testQuestion")
                .select(selectFields !== null && selectFields !== void 0 ? selectFields : fields)
                .leftJoin("testQuestion.question", "question")
                .leftJoin("question.person", "person")
                .leftJoin("question.descriptor", "descriptor")
                .leftJoin("descriptor.topic", "topic")
                .leftJoin("topic.classroomCategory", "classroomCategory")
                .leftJoin("testQuestion.questionGroup", "questionGroup")
                .where("testQuestion.test = :testId", { testId })
                .orderBy("questionGroup.id", "ASC")
                .addOrderBy("testQuestion.order", "ASC")
                .getMany();
        });
    }
}
exports.testController = new TestController();

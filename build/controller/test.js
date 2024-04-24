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
const typeorm_1 = require("typeorm");
const Test_1 = require("../model/Test");
const data_source_1 = require("../data-source");
const Person_1 = require("../model/Person");
const Period_1 = require("../model/Period");
const Classroom_1 = require("../model/Classroom");
const StudentClassroom_1 = require("../model/StudentClassroom");
const TestQuestion_1 = require("../model/TestQuestion");
const QuestionGroup_1 = require("../model/QuestionGroup");
const StudentQuestion_1 = require("../model/StudentQuestion");
const StudentTestStatus_1 = require("../model/StudentTestStatus");
const personCategories_1 = require("../utils/personCategories");
const Year_1 = require("../model/Year");
class TestController extends genericController_1.GenericController {
    constructor() {
        super(Test_1.Test);
    }
    getGraphic(request) {
        return __awaiter(this, void 0, void 0, function* () {
            const testId = request === null || request === void 0 ? void 0 : request.params.id;
            const classroomId = request === null || request === void 0 ? void 0 : request.params.classroom;
            const yearId = request === null || request === void 0 ? void 0 : request.query.year;
            try {
                const teacher = yield this.teacherByUser(request === null || request === void 0 ? void 0 : request.body.user.user);
                const isAdminSupervisor = teacher.person.category.id === personCategories_1.personCategories.ADMINISTRADOR || teacher.person.category.id === personCategories_1.personCategories.SUPERVISOR;
                const { classrooms } = yield this.teacherClassrooms(request === null || request === void 0 ? void 0 : request.body.user);
                if (!classrooms.includes(Number(classroomId)) && !isAdminSupervisor)
                    return { status: 401, message: "Você não tem permissão para acessar essa sala." };
                const classroom = yield data_source_1.AppDataSource.getRepository(Classroom_1.Classroom).findOne({ where: { id: Number(classroomId) }, relations: ["school"] });
                if (!classroom)
                    return { status: 404, message: "Sala não encontrada" };
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
                            const testQuestion = testQuestions.find(testQuestion => testQuestion.id === studentQuestion.testQuestion.id);
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
                    studentClassrooms: allClasses.flatMap(cl => cl.studentClassrooms)
                };
                // for(let el of allClasses) {
                //   for(let student of el.studentClassrooms) {
                //     cityHall.studentClassrooms.push(student)
                //   }
                // }
                response.classrooms = [...filteredClasses, cityHall];
                const newReturn = Object.assign(Object.assign({}, response), { classrooms: response.classrooms.map((classroom) => {
                        return Object.assign(Object.assign({}, classroom), { studentClassrooms: classroom.studentClassrooms.map((studentClassroom) => {
                                return Object.assign(Object.assign({}, studentClassroom), { studentStatus: studentClassroom.studentStatus.find(studentStatus => studentStatus.test.id === test.id) });
                            }) });
                    }) });
                return { status: 200, data: newReturn };
            }
            catch (error) {
                return { status: 500, message: error.message };
            }
        });
    }
    getAllClassroomStudents(options, request) {
        return __awaiter(this, void 0, void 0, function* () {
            const testId = request === null || request === void 0 ? void 0 : request.params.id;
            const classroomId = request === null || request === void 0 ? void 0 : request.params.classroom;
            const yearName = request === null || request === void 0 ? void 0 : request.params.year;
            try {
                const teacher = yield this.teacherByUser(request === null || request === void 0 ? void 0 : request.body.user.user);
                const isAdminSupervisor = teacher.person.category.id === personCategories_1.personCategories.ADMINISTRADOR || teacher.person.category.id === personCategories_1.personCategories.SUPERVISOR;
                const { classrooms } = yield this.teacherClassrooms(request === null || request === void 0 ? void 0 : request.body.user);
                if (!classrooms.includes(Number(classroomId)) && !isAdminSupervisor)
                    return { status: 401, message: "Você não tem permissão para acessar essa sala." };
                const test = yield this.getTest(Number(testId), Number(yearName));
                if (!test)
                    return { status: 404, message: "Teste não encontrado" };
                const questionGroups = yield this.getTestQuestionsGroups(Number(testId));
                const testQuestions = yield this.getTestQuestions(Number(testId));
                const classroom = yield data_source_1.AppDataSource.getRepository(Classroom_1.Classroom)
                    .createQueryBuilder("classroom")
                    .leftJoinAndSelect("classroom.school", "school")
                    .where("classroom.id = :classroomId", { classroomId })
                    .getOne();
                const studentClassrooms = yield this.studentClassrooms(test, Number(classroomId), yearName);
                yield this.linkStudentToTest(studentClassrooms, test, testQuestions);
                const studentClassroomsWithQuestions = yield this.studentClassroomsWithQuestions(test, testQuestions, Number(classroomId), yearName);
                return { status: 200, data: { test, classroom, testQuestions, studentClassrooms: studentClassroomsWithQuestions, questionGroups } };
            }
            catch (error) {
                return { status: 500, message: error.message };
            }
        });
    }
    studentClassroomsWithQuestions(test, testQuestions, classroomId, yearName) {
        return __awaiter(this, void 0, void 0, function* () {
            const testQuestionsIds = testQuestions.map(testQuestion => testQuestion.id);
            const preResult = yield data_source_1.AppDataSource.getRepository(StudentClassroom_1.StudentClassroom)
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
    studentClassrooms(test, classroomId, yearName) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield data_source_1.AppDataSource.getRepository(StudentClassroom_1.StudentClassroom)
                .createQueryBuilder("studentClassroom")
                .leftJoin("studentClassroom.year", "year")
                .leftJoin("studentClassroom.studentQuestions", "studentQuestions")
                .leftJoinAndSelect("studentClassroom.studentStatus", "studentStatus")
                .leftJoinAndSelect("studentStatus.test", "test", "test.id = :testId", { testId: test.id })
                .leftJoinAndSelect("studentClassroom.student", "student")
                .leftJoinAndSelect("student.person", "person")
                .where("studentClassroom.classroom = :classroomId", { classroomId })
                .andWhere(new typeorm_1.Brackets(qb => {
                qb.where("studentClassroom.startedAt < :testCreatedAt", { testCreatedAt: test.createdAt });
                qb.orWhere("studentQuestions.id IS NOT NULL");
            }))
                .andWhere("year.name = :yearName", { yearName })
                .getMany();
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
    getAllToInsert(request) {
        return __awaiter(this, void 0, void 0, function* () {
            const testId = request === null || request === void 0 ? void 0 : request.params.id;
            const classroomId = request === null || request === void 0 ? void 0 : request.params.classroom;
            const yearName = request.params.year;
            try {
                const test = yield this.getTest(Number(testId), Number(yearName));
                if (!test)
                    return { status: 404, message: "Teste não encontrado" };
                const response = yield this.getStudentsThatAreNotIncluded(test, Number(classroomId), Number(yearName));
                return { status: 200, data: response };
            }
            catch (error) {
                return { status: 500, message: error.message };
            }
        });
    }
    linkStudentToTest(studentClassrooms, test, testQuestions) {
        return __awaiter(this, void 0, void 0, function* () {
            for (let studentClassroom of studentClassrooms) {
                const studentTestStatus = yield data_source_1.AppDataSource.getRepository(StudentTestStatus_1.StudentTestStatus)
                    .findOne({
                    where: { test: { id: test.id }, studentClassroom: { id: studentClassroom.id } },
                });
                if (!studentTestStatus) {
                    yield data_source_1.AppDataSource.getRepository(StudentTestStatus_1.StudentTestStatus).save({
                        active: true,
                        test: test,
                        studentClassroom: studentClassroom,
                        observation: '',
                    });
                }
                for (let testQuestion of testQuestions) {
                    const studentQuestion = yield data_source_1.AppDataSource.getRepository(StudentQuestion_1.StudentQuestion)
                        .findOne({
                        where: { testQuestion: { id: testQuestion.id, test: { id: test.id }, question: { id: testQuestion.question.id } }, studentClassroom: { id: studentClassroom.id } },
                    });
                    if (!studentQuestion) {
                        yield data_source_1.AppDataSource.getRepository(StudentQuestion_1.StudentQuestion).save({
                            answer: '',
                            testQuestion: testQuestion,
                            studentClassroom: studentClassroom,
                        });
                    }
                }
            }
        });
    }
    insertStudents(body) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const test = yield this.getTest(body.test.id, body.year);
                if (!test)
                    return { status: 404, message: "Teste não encontrado" };
                const studentClassrooms = yield this.getStudentsThatAreNotIncluded(test, body.classroom.id, body.year);
                if (!studentClassrooms || studentClassrooms.length < 1)
                    return { status: 404, message: "Alunos não encontrados" };
                const testQuestions = yield this.getTestQuestions(test.id);
                const filteredStudentClassrooms = studentClassrooms.filter(studentClassroom => body.studentClassrooms.includes(studentClassroom.id));
                yield this.linkStudentToTest(filteredStudentClassrooms, test, testQuestions);
                let result = {};
                return { status: 200, data: result };
            }
            catch (error) {
                return { status: 500, message: error.message };
            }
        });
    }
    getStudentsThatAreNotIncluded(test, classroomId, yearName) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield data_source_1.AppDataSource.getRepository(StudentClassroom_1.StudentClassroom)
                .createQueryBuilder("studentClassroom")
                .select([
                'studentClassroom.id AS id',
                'studentClassroom.rosterNumber AS rosterNumber',
                'studentClassroom.startedAt AS startedAt',
                'studentClassroom.endedAt AS endedAt',
                'person.name AS name',
                'student.ra AS ra',
                'student.dv AS dv',
            ])
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
    findAllWhere(options, request) {
        return __awaiter(this, void 0, void 0, function* () {
            const yearName = request === null || request === void 0 ? void 0 : request.params.year;
            const search = request === null || request === void 0 ? void 0 : request.query.search;
            const userBody = request === null || request === void 0 ? void 0 : request.body.user;
            try {
                const teacherClasses = yield this.teacherClassrooms(request === null || request === void 0 ? void 0 : request.body.user);
                const testClasses = yield data_source_1.AppDataSource.getRepository(Test_1.Test)
                    .createQueryBuilder("test")
                    .leftJoinAndSelect("test.person", "person")
                    .leftJoinAndSelect("test.period", "period")
                    .leftJoinAndSelect("test.category", "category")
                    .leftJoinAndSelect("period.year", "year")
                    .leftJoinAndSelect("period.bimester", "bimester")
                    .leftJoinAndSelect("test.discipline", "discipline")
                    .leftJoinAndSelect("test.classrooms", "classroom")
                    .leftJoinAndSelect("classroom.school", "school")
                    .where(new typeorm_1.Brackets(qb => {
                    if (userBody.category != personCategories_1.personCategories.ADMINISTRADOR && userBody.category != personCategories_1.personCategories.SUPERVISOR) {
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
    findOneById(testId, body) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const teacher = yield this.teacherByUser(body === null || body === void 0 ? void 0 : body.user.user);
                const test = yield data_source_1.AppDataSource.getRepository(Test_1.Test)
                    .findOne({
                    relations: ["period", "period.year", "period.bimester", "discipline", "category", "person", "classrooms.school"],
                    where: { id: Number(testId) },
                });
                if (teacher.person.id !== (test === null || test === void 0 ? void 0 : test.person.id))
                    return { status: 401, message: "Você não tem permissão para editar esse teste." };
                if (!test) {
                    return { status: 404, message: 'Data not found' };
                }
                const testQuestions = yield data_source_1.AppDataSource.getRepository(TestQuestion_1.TestQuestion)
                    .createQueryBuilder("testQuestion")
                    .select([
                    "testQuestion.id",
                    "testQuestion.order",
                    "testQuestion.answer",
                    "testQuestion.active",
                    "question.id",
                    "question.title",
                    "descriptor.id",
                    "descriptor.code",
                    "descriptor.name",
                    "topic.id",
                    "topic.name",
                    "topic.description",
                    "classroomCategory.id",
                    "classroomCategory.name",
                    "questionGroup.id",
                    "questionGroup.name",
                ])
                    .leftJoin("testQuestion.question", "question")
                    .leftJoin("question.descriptor", "descriptor")
                    .leftJoin("descriptor.topic", "topic")
                    .leftJoin("topic.classroomCategory", "classroomCategory")
                    .leftJoin("testQuestion.questionGroup", "questionGroup")
                    .where("testQuestion.test = :testId", { testId: test.id })
                    .orderBy("questionGroup.id", "ASC")
                    .addOrderBy("testQuestion.order", "ASC")
                    .getMany();
                return { status: 200, data: Object.assign(Object.assign({}, test), { testQuestions }) };
            }
            catch (error) {
                return { status: 500, message: error.message };
            }
        });
    }
    save(body, options) {
        return __awaiter(this, void 0, void 0, function* () {
            const classesIds = body.classroom.map((classroom) => classroom.id);
            try {
                const userPerson = yield data_source_1.AppDataSource.getRepository(Person_1.Person)
                    .findOne({ where: { user: { id: body.user.user } } });
                const checkYear = yield data_source_1.AppDataSource.getRepository(Year_1.Year)
                    .findOne({ where: { id: body.year.id } });
                if (!checkYear)
                    return { status: 404, message: "Ano não encontrado" };
                if (!checkYear.active)
                    return { status: 400, message: "Não é possível criar um teste para um ano letivo inativo." };
                const period = yield data_source_1.AppDataSource.getRepository(Period_1.Period)
                    .findOne({ relations: ["year", "bimester"], where: { year: body.year, bimester: body.bimester } });
                if (!userPerson)
                    return { status: 404, message: "Usuário inexistente" };
                if (!period)
                    return { status: 404, message: "Period não encontrado" };
                const classes = yield data_source_1.AppDataSource.getRepository(Classroom_1.Classroom)
                    .createQueryBuilder("classroom")
                    .select(["classroom.id", "classroom.name", "classroom.shortName"])
                    .leftJoin("classroom.studentClassrooms", "studentClassroom")
                    .leftJoin('studentClassroom.year', 'year')
                    .where("classroom.id IN (:...classesIds)", { classesIds })
                    .andWhere('year.id = :yearId', { yearId: period.year.id })
                    .andWhere("studentClassroom.startedAt < :testCreatedAt", { testCreatedAt: new Date() })
                    .andWhere('studentClassroom.endedAt IS NULL')
                    .groupBy("classroom.id, studentClassroom.id")
                    .having("COUNT(studentClassroom.id) > 0")
                    .getMany();
                if (!classes || classes.length < 1)
                    return { status: 400, message: "Não existem alunos matriculados em alguma das salas informadas." };
                const newTest = yield data_source_1.AppDataSource.getRepository(Test_1.Test).save({
                    name: body.name,
                    category: body.category,
                    discipline: body.discipline,
                    person: userPerson,
                    period: period,
                    classrooms: classes,
                    createdAt: new Date(),
                });
                const testQuestions = body.testQuestions.map((register) => (Object.assign(Object.assign({}, register), { test: newTest })));
                yield data_source_1.AppDataSource.getRepository(TestQuestion_1.TestQuestion).save(testQuestions);
                return { status: 201, data: newTest };
            }
            catch (error) {
                return { status: 500, message: error.message };
            }
        });
    }
    updateId(id, body) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const teacher = yield this.teacherByUser(body.user.user);
                const test = yield data_source_1.AppDataSource.getRepository(Test_1.Test)
                    .findOne({
                    relations: ["person"],
                    where: { id: Number(id) }
                });
                if (!test)
                    return { status: 404, message: "Teste não encontrado" };
                if (teacher.person.id !== test.person.id)
                    return { status: 401, message: "Você não tem permissão para editar esse teste." };
                test.name = body.name;
                yield data_source_1.AppDataSource.getRepository(Test_1.Test).save(test);
                const testQuestions = body.testQuestions.map((register) => (Object.assign(Object.assign({}, register), { test: test })));
                yield data_source_1.AppDataSource.getRepository(TestQuestion_1.TestQuestion).save(testQuestions);
                const result = (yield this.findOneById(id, body)).data;
                return { status: 200, data: result };
            }
            catch (error) {
                return { status: 500, message: error.message };
            }
        });
    }
    deleteId(request) {
        return __awaiter(this, void 0, void 0, function* () {
            const testId = request.params.id;
            const body = request.body;
            try {
                const teacher = yield this.teacherByUser(body.user.user);
                const test = yield data_source_1.AppDataSource.getRepository(Test_1.Test)
                    .findOne({
                    relations: ["person"],
                    where: { id: Number(testId) }
                });
                if (!test) {
                    return { status: 404, message: 'Data not found' };
                }
                if (teacher.person.id !== test.person.id)
                    return { status: 401, message: "Você não tem permissão para deletar esse teste." };
                // TODO: Only delete if there is no student with a test result
                yield data_source_1.AppDataSource.getRepository(TestQuestion_1.TestQuestion)
                    .createQueryBuilder()
                    .delete()
                    .from(TestQuestion_1.TestQuestion)
                    .where("test = :testId", { testId })
                    .execute();
                const result = yield data_source_1.AppDataSource.getRepository(Test_1.Test)
                    .createQueryBuilder()
                    .delete()
                    .from(Test_1.Test)
                    .where("id = :testId", { testId })
                    .execute();
                return { status: 200, data: result };
            }
            catch (error) {
                return { status: 500, message: error.message };
            }
        });
    }
    getTest(testId, yearName) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield data_source_1.AppDataSource.getRepository(Test_1.Test)
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
}
exports.testController = new TestController();

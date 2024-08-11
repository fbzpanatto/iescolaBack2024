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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.stController = void 0;
const StudentClassroom_1 = require("../model/StudentClassroom");
const genericController_1 = require("./genericController");
const typeorm_1 = require("typeorm");
const Student_1 = require("../model/Student");
const data_source_1 = require("../data-source");
const PersonCategory_1 = require("../model/PersonCategory");
const personCategories_1 = require("../utils/personCategories");
const StudentDisability_1 = require("../model/StudentDisability");
const Disability_1 = require("../model/Disability");
const State_1 = require("../model/State");
const owner_1 = require("../utils/owner");
const Classroom_1 = require("../model/Classroom");
const Transfer_1 = require("../model/Transfer");
const TransferStatus_1 = require("../model/TransferStatus");
const Year_1 = require("../model/Year");
const Literacy_1 = require("../model/Literacy");
const LiteracyTier_1 = require("../model/LiteracyTier");
const LiteracyFirst_1 = require("../model/LiteracyFirst");
const disability_1 = require("./disability");
const state_1 = require("./state");
const teacherClassrooms_1 = require("./teacherClassrooms");
const Teacher_1 = require("../model/Teacher");
const transferStatus_1 = require("../utils/transferStatus");
const getTimeZone_1 = __importDefault(require("../utils/getTimeZone"));
class StudentController extends genericController_1.GenericController {
    constructor() { super(Student_1.Student); }
    studentForm(req) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                return yield data_source_1.AppDataSource.transaction((CONN) => __awaiter(this, void 0, void 0, function* () {
                    const states = (yield state_1.stateController.findAllWhere({}, req, CONN)).data;
                    const disabilities = (yield disability_1.disabilityController.findAllWhere({}, req, CONN)).data;
                    const teacherClassrooms = (yield teacherClassrooms_1.teacherClassroomsController.getAllTClass(req, CONN)).data;
                    return { status: 200, data: { disabilities, states, teacherClassrooms } };
                }));
            }
            catch (error) {
                return { status: 500, message: error.message };
            }
        });
    }
    getAllInactivates(request) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                return data_source_1.AppDataSource.transaction((CONN) => __awaiter(this, void 0, void 0, function* () {
                    const currentYear = yield this.currentYear(CONN);
                    if (!currentYear) {
                        return { status: 404, message: "Não existe um ano letivo ativo. Entre em contato com o Administrador do sistema." };
                    }
                    const lastYearName = Number(currentYear.name) - 1;
                    const lastYearDB = yield CONN.findOne(Year_1.Year, { where: { name: lastYearName.toString() } });
                    if (!lastYearDB) {
                        return { status: 404, message: `Não existe ano letivo anterior ou posterior a ${currentYear.name}.` };
                    }
                    const preResult = yield data_source_1.AppDataSource.getRepository(Student_1.Student)
                        .createQueryBuilder("student")
                        .leftJoinAndSelect("student.person", "person")
                        .leftJoinAndSelect("student.state", "state")
                        .leftJoinAndSelect("student.studentClassrooms", "studentClassroom")
                        .leftJoinAndSelect("studentClassroom.classroom", "classroom")
                        .leftJoinAndSelect("classroom.school", "school")
                        .leftJoinAndSelect("studentClassroom.year", "year")
                        .where("studentClassroom.endedAt IS NOT NULL")
                        .andWhere("student.active = 1")
                        .andWhere(new typeorm_1.Brackets((qb) => { qb.where("person.name LIKE :search", { search: `%${request.query.search} %` }).orWhere("student.ra LIKE :search", { search: `%${request.query.search}%` }); }))
                        .andWhere("year.name = :yearName", { yearName: request.params.year })
                        .andWhere((qb) => { const subQueryNoCurrentYear = qb.subQuery().select("1").from("student_classroom", "sc1").where("sc1.studentId = student.id").andWhere("sc1.yearId = :currentYearId", { currentYearId: currentYear.id }).andWhere("sc1.endedAt IS NULL").getQuery(); return `NOT EXISTS ${subQueryNoCurrentYear}`; })
                        .andWhere((qb) => { const subQueryLastYearOrOlder = qb.subQuery().select("MAX(sc2.endedAt)").from("student_classroom", "sc2").where("sc2.studentId = student.id").andWhere("sc2.yearId <= :lastYearId", { lastYearId: lastYearDB.id }).getQuery(); return `studentClassroom.endedAt = (${subQueryLastYearOrOlder})`; })
                        .orderBy("person.name", "ASC")
                        .limit(100)
                        .getMany();
                    return { status: 200, data: preResult.map((student) => (Object.assign(Object.assign({}, student), { studentClassrooms: this.getOneClassroom(student.studentClassrooms) }))) };
                }));
            }
            catch (error) {
                return { status: 500, message: error.message };
            }
        });
    }
    setInactiveNewClassroom(body) {
        return __awaiter(this, void 0, void 0, function* () {
            // TODO: implementar verificação se há mudança de sala para o mesmo classroomNumber e mesmo ano.
            const { student, oldYear, newClassroom, oldClassroom, user } = body;
            try {
                return yield data_source_1.AppDataSource.transaction((CONN) => __awaiter(this, void 0, void 0, function* () {
                    const currentYear = yield this.currentYear(CONN);
                    if (!currentYear) {
                        return { status: 404, message: 'Não existe um ano letivo ativo. Entre em contato com o Administrador do sistema.' };
                    }
                    const uTeacher = yield this.teacherByUser(user.user, CONN);
                    const activeSc = yield CONN.findOne(StudentClassroom_1.StudentClassroom, {
                        relations: ['classroom.school', 'student.person', 'year'], where: { student: { id: student.id }, endedAt: (0, typeorm_1.IsNull)() }
                    });
                    if (activeSc) {
                        return { status: 409, message: `O aluno ${activeSc.student.person.name} está matriculado na sala ${activeSc.classroom.shortName} ${activeSc.classroom.school.shortName} em ${activeSc.year.name}. Solicite sua transferência através do menu Matrículas Ativas` };
                    }
                    const lastYearName = Number(currentYear.name) - 1;
                    const lastYearDB = yield CONN.findOne(Year_1.Year, { where: { name: lastYearName.toString() } });
                    const oldYearDB = yield CONN.findOne(Year_1.Year, { where: { id: oldYear } });
                    if (!lastYearDB) {
                        return { status: 404, message: 'Não foi possível encontrar o ano letivo anterior.' };
                    }
                    if (!oldYearDB) {
                        return { status: 404, message: 'Não foi possível encontrar o ano letivo informado.' };
                    }
                    const lastRegister = yield CONN.getRepository(Student_1.Student)
                        .createQueryBuilder('student')
                        .leftJoinAndSelect('student.person', 'person')
                        .leftJoinAndSelect('student.state', 'state')
                        .leftJoinAndSelect('student.studentClassrooms', 'studentClassroom')
                        .leftJoinAndSelect('studentClassroom.classroom', 'classroom')
                        .leftJoinAndSelect('classroom.school', 'school')
                        .leftJoinAndSelect('studentClassroom.year', 'year')
                        .where('studentClassroom.endedAt IS NOT NULL')
                        .andWhere('student.id = :studentId', { studentId: student.id })
                        .andWhere('year.id = :yearId', { yearId: lastYearDB.id })
                        .andWhere(qb => {
                        const subQueryMaxEndedAt = qb
                            .subQuery()
                            .select('MAX(sc2.endedAt)')
                            .from('student_classroom', 'sc2')
                            .where('sc2.studentId = student.id')
                            .andWhere('sc2.yearId = :yearId', { yearId: lastYearDB.id })
                            .getQuery();
                        return `studentClassroom.endedAt = (${subQueryMaxEndedAt})`;
                    })
                        .getOne();
                    if (lastRegister && (lastRegister === null || lastRegister === void 0 ? void 0 : lastRegister.studentClassrooms.length) > 0 && Number(currentYear.name) - Number(oldYearDB.name) > 1) {
                        return { status: 409, message: `O aluno ${lastRegister.person.name} possui matrícula encerrada para o ano letivo de ${lastYearDB.name}. Acesse o ano letivo ${lastYearDB.name} em Passar de Ano e faça a transfêrencia.` };
                    }
                    const classroom = yield CONN.findOne(Classroom_1.Classroom, { where: { id: newClassroom.id } });
                    const oldClassInDb = yield CONN.findOne(Classroom_1.Classroom, { where: { id: oldClassroom.id } });
                    if (Number(classroom.name.replace(/\D/g, '')) < Number(oldClassInDb.name.replace(/\D/g, ''))) {
                        return { status: 400, message: 'Regressão de sala não é permitido.' };
                    }
                    const newStudentClassroom = yield CONN.save(StudentClassroom_1.StudentClassroom, {
                        student: student,
                        classroom: classroom,
                        year: currentYear,
                        rosterNumber: 99,
                        startedAt: new Date(),
                        createdByUser: uTeacher.person.user.id
                    });
                    const classroomNumber = Number(classroom.shortName.replace(/\D/g, ''));
                    if (classroomNumber === 1) {
                        const literacyTier = yield CONN.find(LiteracyTier_1.LiteracyTier);
                        for (let tier of literacyTier) {
                            yield CONN.save(Literacy_1.Literacy, { studentClassroom: newStudentClassroom, literacyTier: tier });
                        }
                    }
                    yield data_source_1.AppDataSource.getRepository(Transfer_1.Transfer).save({
                        startedAt: new Date(),
                        endedAt: new Date(),
                        requester: uTeacher,
                        requestedClassroom: classroom,
                        currentClassroom: oldClassInDb,
                        receiver: uTeacher,
                        student: student,
                        status: yield CONN.findOne(TransferStatus_1.TransferStatus, { where: { id: 1, name: 'Aceitada' } }),
                        year: currentYear,
                        createdByUser: uTeacher.person.user.id
                    });
                    return { status: 200, data: newStudentClassroom };
                }));
            }
            catch (error) {
                return { status: 500, message: error.message };
            }
        });
    }
    allStudents(req) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                return yield data_source_1.AppDataSource.transaction((CONN) => __awaiter(this, void 0, void 0, function* () {
                    const teacher = yield this.teacherByUser(req.body.user.user, CONN);
                    const teacherClasses = yield this.teacherClassrooms(req === null || req === void 0 ? void 0 : req.body.user, CONN);
                    const masterTeacher = teacher.person.category.id === personCategories_1.pc.ADMN || teacher.person.category.id === personCategories_1.pc.SUPE || teacher.person.category.id === personCategories_1.pc.FORM;
                    const limit = !isNaN(parseInt(req.query.limit)) ? parseInt(req.query.limit) : 100;
                    const offset = !isNaN(parseInt(req.query.offset)) ? parseInt(req.query.offset) : 0;
                    const studentsClassrooms = yield this.studentsClassrooms({
                        search: req.query.search,
                        year: req.params.year, teacherClasses,
                        owner: req.query.owner
                    }, masterTeacher, limit, offset);
                    return { status: 200, data: studentsClassrooms };
                }));
            }
            catch (error) {
                return { status: 500, message: error.message };
            }
        });
    }
    findOneStudentById(req) {
        return __awaiter(this, void 0, void 0, function* () {
            const { params, body } = req;
            try {
                return yield data_source_1.AppDataSource.transaction((CONN) => __awaiter(this, void 0, void 0, function* () {
                    const options = { relations: ["person.category"], where: { person: { user: { id: body === null || body === void 0 ? void 0 : body.user.user } } } };
                    const uTeacher = yield CONN.findOne(Teacher_1.Teacher, Object.assign({}, options));
                    const masterUser = (uTeacher === null || uTeacher === void 0 ? void 0 : uTeacher.person.category.id) === personCategories_1.pc.ADMN || (uTeacher === null || uTeacher === void 0 ? void 0 : uTeacher.person.category.id) === personCategories_1.pc.SUPE || (uTeacher === null || uTeacher === void 0 ? void 0 : uTeacher.person.category.id) === personCategories_1.pc.FORM;
                    const teacherClasses = yield this.teacherClassrooms(body === null || body === void 0 ? void 0 : body.user, CONN);
                    const preStudent = yield this.student(Number(params.id), CONN);
                    if (!preStudent) {
                        return { status: 404, message: "Registro não encontrado" };
                    }
                    const data = this.studentResponse(preStudent);
                    if (teacherClasses.classrooms.length > 0 && !teacherClasses.classrooms.includes(data.classroom.id) && !masterUser) {
                        return { status: 403, message: "Você não tem permissão para acessar esse registro." };
                    }
                    return { status: 200, data };
                }));
            }
            catch (error) {
                return { status: 500, message: error.message };
            }
        });
    }
    save(body) {
        return __awaiter(this, void 0, void 0, function* () {
            const rosterNumber = parseInt(body.rosterNumber, 10);
            try {
                return yield data_source_1.AppDataSource.transaction((CONN) => __awaiter(this, void 0, void 0, function* () {
                    const uTeacher = yield this.teacherByUser(body.user.user, CONN);
                    const tClasses = yield this.teacherClassrooms(body.user, CONN);
                    const year = yield this.currentYear(CONN);
                    const state = yield this.state(body.state, CONN);
                    const classroom = yield this.classroom(body.classroom, CONN);
                    const category = yield this.studentCategory(CONN);
                    const disabilities = yield this.disabilities(body.disabilities, CONN);
                    const person = this.createPerson({ name: body.name.toUpperCase().trim(), birth: body.birth, category });
                    if (!year) {
                        return { status: 404, message: "Não existe um ano letivo ativo. Entre em contato com o Administrador do sistema." };
                    }
                    const exists = yield CONN.findOne(Student_1.Student, { where: { ra: body.ra, dv: body.dv } });
                    if (exists) {
                        const el = (yield CONN.getRepository(Student_1.Student)
                            .createQueryBuilder("student")
                            .leftJoinAndSelect("student.person", "person")
                            .leftJoinAndSelect("student.studentClassrooms", "studentClassroom")
                            .leftJoinAndSelect("studentClassroom.classroom", "classroom")
                            .leftJoinAndSelect("classroom.school", "school")
                            .leftJoinAndSelect("studentClassroom.year", "year")
                            .where("student.ra = :ra", { ra: body.ra })
                            .andWhere("student.dv = :dv", { dv: body.dv })
                            .andWhere(new typeorm_1.Brackets((qb) => { qb.where("studentClassroom.endedAt IS NULL").orWhere("studentClassroom.endedAt < :currentDate", { currentDate: new Date() }); }))
                            .getOne());
                        let preR;
                        const actStClassroom = el.studentClassrooms.find((sc) => sc.endedAt === null);
                        if (actStClassroom) {
                            preR = actStClassroom;
                        }
                        else {
                            preR = el.studentClassrooms.find((sc) => (0, getTimeZone_1.default)(sc.endedAt) === Math.max(...el.studentClassrooms.map((sc) => (0, getTimeZone_1.default)(sc.endedAt))));
                        }
                        if (!el.active) {
                            return { status: 409, message: `RA existente. ${el.person.name} se formou em: ${preR === null || preR === void 0 ? void 0 : preR.classroom.shortName} ${preR === null || preR === void 0 ? void 0 : preR.classroom.school.shortName} no ano de ${preR === null || preR === void 0 ? void 0 : preR.year.name}.` };
                        }
                        return { status: 409, message: `Já existe um aluno com o RA informado. ${el.person.name} tem como último registro: ${preR === null || preR === void 0 ? void 0 : preR.classroom.shortName} ${preR === null || preR === void 0 ? void 0 : preR.classroom.school.shortName} no ano ${preR === null || preR === void 0 ? void 0 : preR.year.name}. ${preR.endedAt === null ? `Acesse o menu MATRÍCULAS ATIVAS no ano de ${preR.year.name}.` : `Acesse o menu PASSAR DE ANO no ano de ${preR.year.name}.`}` };
                    }
                    const message = "Você não tem permissão para criar um aluno nesta sala.";
                    if (body.user.category === personCategories_1.pc.PROF) {
                        if (!tClasses.classrooms.includes(classroom.id)) {
                            return { status: 403, message };
                        }
                    }
                    let student = null;
                    student = yield CONN.save(Student_1.Student, this.createStudent(body, person, state, uTeacher.person.user.id));
                    if (!!disabilities.length) {
                        const mappDis = disabilities.map((disability) => { return { student: student, startedAt: new Date(), disability, createdByUser: uTeacher.person.user.id }; });
                        yield CONN.save(StudentDisability_1.StudentDisability, mappDis);
                    }
                    const stObject = (yield CONN.save(StudentClassroom_1.StudentClassroom, { student, classroom, year, rosterNumber, startedAt: new Date(), createdByUser: uTeacher.person.user.id }));
                    const notDigit = /\D/g;
                    const classroomNumber = Number(stObject.classroom.shortName.replace(notDigit, ""));
                    const tStatus = (yield CONN.findOne(TransferStatus_1.TransferStatus, { where: { id: 5, name: "Novo" } }));
                    const transfer = { startedAt: new Date(), endedAt: new Date(), requester: uTeacher, requestedClassroom: classroom, currentClassroom: classroom, receiver: uTeacher, student, status: tStatus, createdByUser: uTeacher.person.user.id, year: yield this.currentYear(CONN) };
                    yield CONN.save(Transfer_1.Transfer, transfer);
                    if (classroomNumber === 1) {
                        const literacyTier = yield CONN.find(LiteracyTier_1.LiteracyTier);
                        for (let tier of literacyTier) {
                            yield CONN.save(Literacy_1.Literacy, { studentClassroom: stObject, literacyTier: tier, createdByUser: uTeacher.person.user.id, createdAt: new Date() });
                        }
                        yield CONN.save(LiteracyFirst_1.LiteracyFirst, { student, createdAt: new Date(), createdByUser: uTeacher.person.user.id });
                    }
                    return { status: 201, data: student };
                }));
            }
            catch (error) {
                return { status: 500, message: error.message };
            }
        });
    }
    putLiteracyBeforeLevel(body) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                return yield data_source_1.AppDataSource.transaction((CONN) => __awaiter(this, void 0, void 0, function* () {
                    const uTeacher = yield this.teacherByUser(body.user.user);
                    const masterUser = uTeacher.person.category.id === personCategories_1.pc.ADMN || uTeacher.person.category.id === personCategories_1.pc.SUPE || uTeacher.person.category.id === personCategories_1.pc.FORM;
                    const classroomNumber = Number(body.studentClassroom.classroom.shortName.replace(/\D/g, ""));
                    const register = yield CONN.findOne(LiteracyFirst_1.LiteracyFirst, { relations: ["literacyLevel"], where: { student: { id: body.studentClassroom.student.id } } });
                    if (!register) {
                        return { status: 404, message: "Registro não encontrado" };
                    }
                    if ((classroomNumber === 1 && register && register.literacyLevel === null) || masterUser) {
                        register.literacyLevel = body.literacyLevel;
                        register.updatedAt = new Date();
                        register.updatedByUser = uTeacher.person.user.id;
                        yield CONN.save(LiteracyFirst_1.LiteracyFirst, register);
                        return { status: 201, data: {} };
                    }
                    return { status: 201, data: {} };
                }));
            }
            catch (error) {
                return { status: 500, message: error.message };
            }
        });
    }
    updateId(studentId, body) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                let result;
                return yield data_source_1.AppDataSource.transaction((CONN) => __awaiter(this, void 0, void 0, function* () {
                    var _a;
                    const uTeacher = yield this.teacherByUser(body.user.user, CONN);
                    const dbStudentOptions = {
                        relations: ["person", "studentDisabilities.disability", "state"], where: { id: Number(studentId) }
                    };
                    const dbStudent = yield CONN.findOne(Student_1.Student, dbStudentOptions);
                    const bodyClass = yield CONN.findOne(Classroom_1.Classroom, { where: { id: body.classroom } });
                    const arrRel = ["student", "classroom", "literacies.literacyTier", "literacies.literacyLevel", "year"];
                    const stClassroomOptions = {
                        relations: arrRel, where: { id: Number(body.currentStudentClassroomId), student: { id: dbStudent.id }, endedAt: (0, typeorm_1.IsNull)() }
                    };
                    const stClass = yield CONN.findOne(StudentClassroom_1.StudentClassroom, Object.assign({}, stClassroomOptions));
                    if (!dbStudent) {
                        return { status: 404, message: "Registro não encontrado" };
                    }
                    if (!stClass) {
                        return { status: 404, message: "Registro não encontrado" };
                    }
                    if (!bodyClass) {
                        return { status: 404, message: "Sala não encontrada" };
                    }
                    const cBodySRA = `${body.ra}${body.dv}`;
                    const databaseStudentRa = `${dbStudent.ra}${dbStudent.dv}`;
                    if (databaseStudentRa !== cBodySRA && uTeacher.person.category.id != personCategories_1.pc.ADMN) {
                        return { status: 403, message: 'Você não tem permissão para modificar o RA de um aluno. Solicite ao Administrador do sistema.' };
                    }
                    if (databaseStudentRa !== cBodySRA) {
                        const exists = yield CONN.findOne(Student_1.Student, { where: { ra: body.ra, dv: body.dv } });
                        if (exists) {
                            return { status: 409, message: "Já existe um aluno com esse RA" };
                        }
                    }
                    const canChange = [personCategories_1.pc.ADMN, personCategories_1.pc.SUPE, personCategories_1.pc.DIRE, personCategories_1.pc.VICE, personCategories_1.pc.COOR, personCategories_1.pc.SECR];
                    const message = "Você não tem permissão para alterar a sala de um aluno por aqui. Crie uma solicitação de transferência no menu ALUNOS na opção OUTROS ALUNOS.";
                    if (!canChange.includes(uTeacher.person.category.id) && (stClass === null || stClass === void 0 ? void 0 : stClass.classroom.id) != bodyClass.id) {
                        return { status: 403, message };
                    }
                    const currentYear = (yield CONN.findOne(Year_1.Year, { where: { endedAt: (0, typeorm_1.IsNull)(), active: true } }));
                    const pedTransOptions = {
                        relations: ['requester.person', 'requestedClassroom.school'],
                        where: {
                            student: { id: stClass.student.id },
                            currentClassroom: { id: stClass.classroom.id },
                            status: { id: transferStatus_1.transferStatus.PENDING }, year: { id: currentYear.id }, endedAt: (0, typeorm_1.IsNull)()
                        }
                    };
                    const pendingTransfer = yield CONN.findOne(Transfer_1.Transfer, pedTransOptions);
                    if (pendingTransfer) {
                        return { status: 403, message: `Existe um pedido de transferência ativo feito por: ${pendingTransfer.requester.person.name} para a sala: ${pendingTransfer.requestedClassroom.shortName} - ${pendingTransfer.requestedClassroom.school.shortName}` };
                    }
                    if ((stClass === null || stClass === void 0 ? void 0 : stClass.classroom.id) != bodyClass.id && canChange.includes(uTeacher.person.category.id)) {
                        const newNumber = Number(bodyClass.shortName.replace(/\D/g, ""));
                        const oldNumber = Number(stClass.classroom.shortName.replace(/\D/g, ""));
                        if (newNumber < oldNumber) {
                            return { status: 404, message: "Não é possível alterar a sala para uma sala com número menor que a atual." };
                        }
                        yield CONN.save(StudentClassroom_1.StudentClassroom, Object.assign(Object.assign({}, stClass), { endedAt: new Date(), updatedByUser: uTeacher.person.user.id }));
                        const lastRosterNumber = yield CONN.find(StudentClassroom_1.StudentClassroom, { relations: ["classroom", "year"], where: { year: { id: currentYear.id }, classroom: { id: bodyClass.id } }, order: { rosterNumber: "DESC" }, take: 1 });
                        let last = 1;
                        if ((_a = lastRosterNumber[0]) === null || _a === void 0 ? void 0 : _a.rosterNumber) {
                            last = lastRosterNumber[0].rosterNumber + 1;
                        }
                        const newStClass = yield CONN.save(StudentClassroom_1.StudentClassroom, { student: dbStudent, classroom: bodyClass, year: currentYear, rosterNumber: last, startedAt: new Date(), createdByUser: uTeacher.person.user.id });
                        const notDigit = /\D/g;
                        const classNumber = Number(bodyClass.shortName.replace(notDigit, ""));
                        if (classNumber === 1) {
                            const literacyTier = yield CONN.find(LiteracyTier_1.LiteracyTier);
                            if (stClass.classroom.id != newStClass.classroom.id && oldNumber === newNumber && stClass.year.id === newStClass.year.id) {
                                for (let tier of literacyTier) {
                                    const literacy = stClass.literacies.find((el) => el.literacyTier.id === tier.id && el.literacyLevel != null);
                                    if (literacy) {
                                        yield CONN.save(Literacy_1.Literacy, { studentClassroom: newStClass, literacyTier: literacy.literacyTier, literacyLevel: literacy.literacyLevel, toRate: false, createdAt: new Date(), createdByUser: uTeacher.person.user.id });
                                    }
                                    else {
                                        yield CONN.save(Literacy_1.Literacy, { studentClassroom: newStClass, literacyTier: tier, createdAt: new Date(), createdByUser: uTeacher.person.user.id });
                                    }
                                }
                            }
                            else {
                                for (let tier of literacyTier) {
                                    yield CONN.save(Literacy_1.Literacy, { studentClassroom: newStClass, literacyTier: tier, createdAt: new Date(), createdByUser: uTeacher.person.user.id });
                                }
                            }
                        }
                        const transfer = new Transfer_1.Transfer();
                        transfer.createdByUser = uTeacher.person.user.id;
                        transfer.startedAt = new Date();
                        transfer.endedAt = new Date();
                        transfer.requester = uTeacher;
                        transfer.requestedClassroom = bodyClass;
                        transfer.currentClassroom = stClass.classroom;
                        transfer.receiver = uTeacher;
                        transfer.student = dbStudent;
                        transfer.status = (yield CONN.findOne(TransferStatus_1.TransferStatus, { where: { id: 1, name: "Aceitada" } }));
                        transfer.year = (yield CONN.findOne(Year_1.Year, { where: { endedAt: (0, typeorm_1.IsNull)(), active: true } }));
                        yield CONN.save(Transfer_1.Transfer, transfer);
                    }
                    if (stClass.classroom.id === bodyClass.id) {
                        yield CONN.save(StudentClassroom_1.StudentClassroom, Object.assign(Object.assign({}, stClass), { rosterNumber: body.rosterNumber, createdAt: new Date(), createdByUser: uTeacher.person.user.id }));
                    }
                    dbStudent.ra = body.ra;
                    dbStudent.dv = body.dv;
                    dbStudent.updatedAt = new Date();
                    dbStudent.updatedByUser = uTeacher.person.user.id;
                    dbStudent.person.name = body.name.toUpperCase();
                    dbStudent.person.birth = body.birth;
                    dbStudent.observationOne = body.observationOne;
                    dbStudent.observationTwo = body.observationTwo;
                    dbStudent.state = (yield CONN.findOne(State_1.State, { where: { id: body.state } }));
                    const stDisabilities = dbStudent.studentDisabilities.filter((studentDisability) => !studentDisability.endedAt);
                    yield this.setDisabilities(uTeacher.person.user.id, yield CONN.save(Student_1.Student, dbStudent), stDisabilities, body.disabilities, CONN);
                    result = this.studentResponse(yield this.student(Number(studentId), CONN));
                    return { status: 200, data: result };
                }));
            }
            catch (error) {
                console.log(error);
                return { status: 500, message: error.message };
            }
        });
    }
    setDisabilities(uTeacherId, student, studentDisabilities, body, CONN) {
        return __awaiter(this, void 0, void 0, function* () {
            const currentDisabilities = studentDisabilities.map((studentDisability) => studentDisability.disability.id);
            const create = body.filter((disabilityId) => !currentDisabilities.includes(disabilityId));
            if (create.length) {
                const disabilities = create.map((disabilityId) => { return { createdByUser: uTeacherId, student, disability: { id: disabilityId }, startedAt: new Date() }; });
                yield CONN.save(StudentDisability_1.StudentDisability, disabilities);
            }
            const remove = currentDisabilities.filter((disabilityId) => !body.includes(disabilityId));
            if (remove.length) {
                for (let item of remove) {
                    const studentDisability = studentDisabilities.find((studentDisability) => studentDisability.disability.id === item);
                    if (studentDisability) {
                        studentDisability.endedAt = new Date();
                        studentDisability.updatedByUser = uTeacherId;
                        yield CONN.save(StudentDisability_1.StudentDisability, studentDisability);
                    }
                }
            }
        });
    }
    studentCategory(CONN) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!CONN) {
                return (yield data_source_1.AppDataSource.getRepository(PersonCategory_1.PersonCategory).findOne({ where: { id: personCategories_1.pc.ALUN } }));
            }
            return yield CONN.findOne(PersonCategory_1.PersonCategory, { where: { id: personCategories_1.pc.ALUN } });
        });
    }
    disabilities(ids, CONN) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!CONN) {
                return yield data_source_1.AppDataSource.getRepository(Disability_1.Disability).findBy({ id: (0, typeorm_1.In)(ids) });
            }
            return yield CONN.findBy(Disability_1.Disability, { id: (0, typeorm_1.In)(ids) });
        });
    }
    student(studentId, CONN) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield CONN
                .createQueryBuilder()
                .select(["student.id", "student.ra", "student.dv", "student.observationOne", "student.observationTwo", "state.id", "state.acronym", "person.id", "person.name", "person.birth", "studentClassroom.id", "studentClassroom.rosterNumber", "studentClassroom.startedAt", "studentClassroom.endedAt", "classroom.id", "classroom.shortName", "school.id", "school.shortName", "GROUP_CONCAT(DISTINCT disability.id ORDER BY disability.id ASC) AS disabilities"])
                .from(Student_1.Student, "student")
                .leftJoin("student.person", "person")
                .leftJoin("student.studentDisabilities", "studentDisabilities", "studentDisabilities.endedAt IS NULL")
                .leftJoin("studentDisabilities.disability", "disability")
                .leftJoin("student.state", "state")
                .leftJoin("student.studentClassrooms", "studentClassroom", "studentClassroom.endedAt IS NULL")
                .leftJoin("studentClassroom.classroom", "classroom")
                .leftJoin("classroom.school", "school")
                .where("student.id = :studentId", { studentId })
                .groupBy("studentClassroom.id")
                .getRawOne();
        });
    }
    studentsClassrooms(options, masterUser, limit, offset) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield data_source_1.AppDataSource.transaction((CONN) => __awaiter(this, void 0, void 0, function* () {
                var _a;
                const isOwner = options.owner === owner_1.ISOWNER.OWNER;
                const yearName = (_a = options.year) !== null && _a !== void 0 ? _a : (yield this.currentYear(CONN)).name;
                let allClassrooms = [];
                if (masterUser) {
                    allClassrooms = (yield CONN.find(Classroom_1.Classroom));
                }
                const result = yield CONN.createQueryBuilder()
                    .select(["studentClassroom.id", "studentClassroom.startedAt", "student.id", "student.ra", "student.dv", "state.id", "state.acronym", "person.id", "person.name", "person.birth", "classroom.id", "classroom.shortName", "school.id", "school.shortName", "transfers.id", "transfers.startedAt", "requesterPerson.name", "transfersStatus.name", "requestedClassroom.shortName", 'requestedClassroomSchool.shortName'])
                    .from(Student_1.Student, "student")
                    .leftJoin("student.person", "person")
                    .leftJoin("student.state", "state")
                    .leftJoin("student.transfers", "transfers", "transfers.endedAt IS NULL")
                    .leftJoin("transfers.status", "transfersStatus")
                    .leftJoin("transfers.requestedClassroom", "requestedClassroom")
                    .leftJoin("requestedClassroom.school", "requestedClassroomSchool")
                    .leftJoin("transfers.requester", "requester")
                    .leftJoin("requester.person", "requesterPerson")
                    .leftJoin("student.studentClassrooms", "studentClassroom", "studentClassroom.endedAt IS NULL")
                    .leftJoin("studentClassroom.classroom", "classroom")
                    .leftJoin("classroom.school", "school")
                    .leftJoin("studentClassroom.year", "year")
                    .where("year.name = :yearName", { yearName })
                    .andWhere(new typeorm_1.Brackets((qb) => {
                    qb.where("person.name LIKE :search", { search: `%${options.search}%` }).orWhere("student.ra LIKE :search", { search: `%${options.search}%` });
                }))
                    .andWhere(new typeorm_1.Brackets((qb) => {
                    var _a;
                    if (!masterUser) {
                        qb.andWhere(isOwner ? "classroom.id IN (:...classrooms)" : "classroom.id NOT IN (:...classrooms)", { classrooms: (_a = options.teacherClasses) === null || _a === void 0 ? void 0 : _a.classrooms });
                    }
                    else {
                        qb.andWhere(isOwner ? "classroom.id IN (:...classrooms)" : "classroom.id NOT IN (:...classrooms)", { classrooms: allClassrooms.map((classroom) => classroom.id) });
                    }
                }))
                    .orderBy("school.shortName", "ASC")
                    .addOrderBy("classroom.shortName", "ASC")
                    .addOrderBy("person.name", "ASC")
                    .limit(limit)
                    .offset(offset)
                    .getRawMany();
                return result.map((item) => {
                    return {
                        id: item.studentClassroom_id,
                        startedAt: item.studentClassroom_startedAt,
                        classroom: {
                            id: item.classroom_id,
                            shortName: item.classroom_shortName,
                            teacher: options.teacherClasses,
                            school: { shortName: item.school_shortName }
                        },
                        student: {
                            id: item.student_id,
                            ra: item.student_ra,
                            dv: item.student_dv,
                            state: { acronym: item.state_acronym },
                            person: { name: item.person_name, birth: item.person_birth },
                            transfer: item.transfers_id ? { id: item.transfers_id, startedAt: item.transfers_startedAt, status: { name: item.transfersStatus_name }, requester: { name: item.requesterPerson_name }, requestedClassroom: { classroom: item.requestedClassroom_shortName, school: item.requestedClassroomSchool_shortName } } : false,
                        },
                    };
                });
            }));
        });
    }
    createStudent(body, person, state, userId) {
        let formatedDv;
        const digit = body.dv.replace(/\D/g, "");
        if (digit.length) {
            formatedDv = body.dv;
        }
        else {
            formatedDv = body.dv.toUpperCase();
        }
        const student = new Student_1.Student();
        student.person = person;
        student.ra = body.ra;
        student.dv = formatedDv;
        student.state = state;
        student.createdByUser = userId;
        student.createdAt = new Date();
        student.observationOne = body.observationOne;
        student.observationTwo = body.observationTwo;
        return student;
    }
    studentResponse(student) {
        var _a, _b;
        return {
            id: student.studentClassroom_id,
            rosterNumber: student.studentClassroom_rosterNumber,
            startedAt: student.studentClassroom_startedAt,
            endedAt: student.studentClassroom_endedAt,
            student: {
                id: student.student_id,
                ra: student.student_ra,
                dv: student.student_dv,
                observationOne: student.student_observationOne,
                observationTwo: student.student_observationTwo,
                state: {
                    id: student.state_id,
                    acronym: student.state_acronym,
                },
                person: {
                    id: student.person_id,
                    name: student.person_name,
                    birth: student.person_birth,
                },
                disabilities: (_b = (_a = student.disabilities) === null || _a === void 0 ? void 0 : _a.split(",").map((disabilityId) => Number(disabilityId))) !== null && _b !== void 0 ? _b : [],
            },
            classroom: {
                id: student.classroom_id,
                shortName: student.classroom_shortName,
                school: {
                    id: student.school_id,
                    shortName: student.school_shortName,
                },
            },
        };
    }
    getOneClassroom(array) {
        const index = array.findIndex((sc) => (0, getTimeZone_1.default)(sc.endedAt) === Math.max(...array.map((sc) => (0, getTimeZone_1.default)(sc.endedAt))));
        return array[index];
    }
    graduate(studentId, body) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                let student = null;
                return yield data_source_1.AppDataSource.transaction((CONN) => __awaiter(this, void 0, void 0, function* () {
                    const uTeacher = yield this.teacherByUser(body.user.user, CONN);
                    const masterUser = uTeacher.person.category.id === personCategories_1.pc.ADMN || uTeacher.person.category.id === personCategories_1.pc.SUPE || uTeacher.person.category.id === personCategories_1.pc.FORM;
                    const { classrooms } = yield this.teacherClassrooms(body.user, CONN);
                    const message = "Você não tem permissão para realizar modificações nesta sala de aula.";
                    if (!classrooms.includes(Number(body.student.classroom.id)) && !masterUser) {
                        return { status: 403, message };
                    }
                    student = (yield CONN.findOne(Student_1.Student, { where: { id: Number(studentId) } }));
                    if (!student) {
                        return { status: 404, message: "Registro não encontrado" };
                    }
                    student.active = body.student.active;
                    student.updatedAt = new Date();
                    student.updatedByUser = uTeacher.person.user.id;
                    yield CONN.save(Student_1.Student, student);
                    const status = yield CONN.findOne(TransferStatus_1.TransferStatus, { where: { id: 6, name: "Formado" } });
                    const year = yield CONN.findOne(Year_1.Year, { where: { id: body.year } });
                    const entity = { status, year, student, receiver: uTeacher, createdByUser: uTeacher.person.user.id, updatedByUser: uTeacher.person.user.id, startedAt: new Date(), endedAt: new Date(), requester: uTeacher, requestedClassroom: body.student.classroom, currentClassroom: body.student.classroom };
                    const transferResponse = yield CONN.save(Transfer_1.Transfer, entity);
                    return { status: 201, data: transferResponse };
                }));
            }
            catch (error) {
                return { status: 500, message: error.message };
            }
        });
    }
}
exports.stController = new StudentController();

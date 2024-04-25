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
exports.studentController = void 0;
const StudentClassroom_1 = require("./../model/StudentClassroom");
const genericController_1 = require("./genericController");
const typeorm_1 = require("typeorm");
const Student_1 = require("../model/Student");
const data_source_1 = require("../data-source");
const PersonCategory_1 = require("../model/PersonCategory");
const personCategories_1 = require("../utils/personCategories");
const StudentDisability_1 = require("../model/StudentDisability");
const Disability_1 = require("../model/Disability");
const owner_1 = require("../utils/owner");
const Classroom_1 = require("../model/Classroom");
const Transfer_1 = require("../model/Transfer");
const TransferStatus_1 = require("../model/TransferStatus");
const getTimeZone_1 = __importDefault(require("../utils/getTimeZone"));
const Year_1 = require("../model/Year");
const Literacy_1 = require("../model/Literacy");
const LiteracyTier_1 = require("../model/LiteracyTier");
const LiteracyFirst_1 = require("../model/LiteracyFirst");
const TextGenderExam_1 = require("../model/TextGenderExam");
const TextGenderExamTier_1 = require("../model/TextGenderExamTier");
const TextGenderClassroom_1 = require("../model/TextGenderClassroom");
const TextGenderGrade_1 = require("../model/TextGenderGrade");
class StudentController extends genericController_1.GenericController {
    constructor() { super(Student_1.Student); }
    getAllInactivates(request) {
        return __awaiter(this, void 0, void 0, function* () {
            const yearName = request === null || request === void 0 ? void 0 : request.params.year;
            const search = request === null || request === void 0 ? void 0 : request.query.search;
            try {
                const currentYear = yield this.currentYear();
                if (!currentYear) {
                    return { status: 404, message: 'Não existe um ano letivo ativo. Entre em contato com o Administrador do sistema.' };
                }
                const lastYearName = Number(currentYear.name) - 1;
                const lastYearDB = yield data_source_1.AppDataSource.getRepository(Year_1.Year).findOne({ where: { name: lastYearName.toString() } });
                if (!lastYearDB) {
                    return { status: 404, message: `Não existe ano letivo anterior ou posterior a ${currentYear.name}.` };
                }
                const preResult = yield data_source_1.AppDataSource.getRepository(Student_1.Student)
                    .createQueryBuilder('student')
                    .leftJoinAndSelect('student.person', 'person')
                    .leftJoinAndSelect('student.state', 'state')
                    .leftJoinAndSelect('student.studentClassrooms', 'studentClassroom')
                    .leftJoinAndSelect('studentClassroom.classroom', 'classroom')
                    .leftJoinAndSelect('classroom.school', 'school')
                    .leftJoinAndSelect('studentClassroom.year', 'year')
                    .where('studentClassroom.endedAt IS NOT NULL')
                    .andWhere('student.active = 1')
                    .andWhere(new typeorm_1.Brackets(qb => {
                    qb.where('person.name LIKE :search', { search: `%${search}%` })
                        .orWhere('student.ra LIKE :search', { search: `%${search}%` });
                }))
                    .andWhere('year.name = :yearName', { yearName })
                    .andWhere(qb => {
                    const subQueryNoCurrentYear = qb
                        .subQuery()
                        .select('1')
                        .from('student_classroom', 'sc1')
                        .where('sc1.studentId = student.id')
                        .andWhere('sc1.yearId = :currentYearId', { currentYearId: currentYear.id })
                        .andWhere('sc1.endedAt IS NULL')
                        .getQuery();
                    return `NOT EXISTS ${subQueryNoCurrentYear}`;
                })
                    .andWhere(qb => {
                    const subQueryLastYearOrOlder = qb
                        .subQuery()
                        .select('MAX(sc2.endedAt)')
                        .from('student_classroom', 'sc2')
                        .where('sc2.studentId = student.id')
                        .andWhere('sc2.yearId <= :lastYearId', { lastYearId: lastYearDB.id })
                        .getQuery();
                    return `studentClassroom.endedAt = (${subQueryLastYearOrOlder})`;
                })
                    .orderBy('person.name', 'ASC')
                    .getMany();
                const result = preResult.map(student => (Object.assign(Object.assign({}, student), { studentClassrooms: this.getOneClassroom(student.studentClassrooms) })));
                return { status: 200, data: result };
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
                const currentYear = yield this.currentYear();
                if (!currentYear) {
                    return { status: 404, message: 'Não existe um ano letivo ativo. Entre em contato com o Administrador do sistema.' };
                }
                const teacher = yield this.teacherByUser(user.user);
                const activeStudentClassroom = yield data_source_1.AppDataSource.getRepository(StudentClassroom_1.StudentClassroom).findOne({
                    relations: ['classroom.school', 'student.person', 'year'],
                    where: { student: { id: student.id }, endedAt: (0, typeorm_1.IsNull)() }
                });
                if (activeStudentClassroom) {
                    return { status: 409, message: `O aluno ${activeStudentClassroom.student.person.name} está matriculado na sala ${activeStudentClassroom.classroom.shortName} ${activeStudentClassroom.classroom.school.shortName} em ${activeStudentClassroom.year.name}. Solicite sua transferência através do menu Matrículas Ativas` };
                }
                const lastYearName = Number(currentYear.name) - 1;
                const lastYearDB = yield data_source_1.AppDataSource.getRepository(Year_1.Year).findOne({ where: { name: lastYearName.toString() } });
                const oldYearDB = yield data_source_1.AppDataSource.getRepository(Year_1.Year).findOne({ where: { id: oldYear } });
                if (!lastYearDB) {
                    return { status: 404, message: 'Não foi possível encontrar o ano letivo anterior.' };
                }
                if (!oldYearDB) {
                    return { status: 404, message: 'Não foi possível encontrar o ano letivo informado.' };
                }
                const lastYearStudentClassroom = yield data_source_1.AppDataSource.getRepository(Student_1.Student)
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
                if (lastYearStudentClassroom && (lastYearStudentClassroom === null || lastYearStudentClassroom === void 0 ? void 0 : lastYearStudentClassroom.studentClassrooms.length) > 0 && Number(currentYear.name) - Number(oldYearDB.name) > 1) {
                    return { status: 409, message: `O aluno ${lastYearStudentClassroom.person.name} possui matrícula encerrada para o ano letivo de ${lastYearDB.name}. Acesse o ano letivo ${lastYearDB.name} em Passar de Ano e faça a transfêrencia.` };
                }
                const classroom = yield data_source_1.AppDataSource.getRepository(Classroom_1.Classroom).findOne({ where: { id: newClassroom.id } });
                const oldClassroomInDatabase = yield data_source_1.AppDataSource.getRepository(Classroom_1.Classroom).findOne({ where: { id: oldClassroom.id } });
                const notDigit = /\D/g;
                if (Number(classroom.name.replace(notDigit, '')) < Number(oldClassroomInDatabase.name.replace(notDigit, ''))) {
                    return { status: 400, message: 'Regressão de sala não é permitido.' };
                }
                const newStudentClassroom = yield data_source_1.AppDataSource.getRepository(StudentClassroom_1.StudentClassroom).save({
                    student: student,
                    classroom: classroom,
                    year: currentYear,
                    rosterNumber: 99,
                    startedAt: new Date()
                });
                const classroomNumber = Number(classroom.shortName.replace(notDigit, ''));
                if (classroomNumber >= 1 && classroomNumber <= 3) {
                    const literacyTier = yield data_source_1.AppDataSource.getRepository(LiteracyTier_1.LiteracyTier).find();
                    for (let tier of literacyTier) {
                        yield data_source_1.AppDataSource.getRepository(Literacy_1.Literacy).save({
                            studentClassroom: newStudentClassroom,
                            literacyTier: tier
                        });
                    }
                }
                if (classroomNumber === 4 || classroomNumber === 5) {
                    const textGenderExam = yield data_source_1.AppDataSource.getRepository(TextGenderExam_1.TextGenderExam).find();
                    const textGenderExamTier = yield data_source_1.AppDataSource.getRepository(TextGenderExamTier_1.TextGenderExamTier).find();
                    const textGenderClassroom = yield data_source_1.AppDataSource.getRepository(TextGenderClassroom_1.TextGenderClassroom).find({
                        where: { classroomNumber: classroomNumber },
                        relations: ['textGender']
                    });
                    for (let tg of textGenderClassroom) {
                        for (let tier of textGenderExamTier) {
                            for (let exam of textGenderExam) {
                                const textGenderGrade = new TextGenderGrade_1.TextGenderGrade();
                                textGenderGrade.studentClassroom = newStudentClassroom;
                                textGenderGrade.textGender = tg.textGender;
                                textGenderGrade.textGenderExam = exam;
                                textGenderGrade.textGenderExamTier = tier;
                                yield data_source_1.AppDataSource.getRepository(TextGenderGrade_1.TextGenderGrade).save(textGenderGrade);
                            }
                        }
                    }
                }
                yield data_source_1.AppDataSource.getRepository(Transfer_1.Transfer).save({
                    startedAt: new Date(),
                    endedAt: new Date(),
                    requester: teacher,
                    requestedClassroom: classroom,
                    currentClassroom: oldClassroomInDatabase,
                    receiver: teacher,
                    student: student,
                    status: yield data_source_1.AppDataSource.getRepository(TransferStatus_1.TransferStatus).findOne({ where: { id: 1, name: 'Aceitada' } }),
                    year: currentYear
                });
                return { status: 200, data: newStudentClassroom };
            }
            catch (error) {
                return { status: 500, message: error.message };
            }
        });
    }
    findAllWhere(options, request) {
        return __awaiter(this, void 0, void 0, function* () {
            const owner = request === null || request === void 0 ? void 0 : request.query.owner;
            const search = request === null || request === void 0 ? void 0 : request.query.search;
            const year = request === null || request === void 0 ? void 0 : request.params.year;
            try {
                const teacher = yield this.teacherByUser(request === null || request === void 0 ? void 0 : request.body.user.user);
                const teacherClasses = yield this.teacherClassrooms(request === null || request === void 0 ? void 0 : request.body.user);
                const isAdminSupervisor = teacher.person.category.id === personCategories_1.personCategories.ADMINISTRADOR || teacher.person.category.id === personCategories_1.personCategories.SUPERVISOR;
                const studentsClassrooms = yield this.studentsClassrooms({ search, year, teacherClasses, owner }, isAdminSupervisor);
                return { status: 200, data: studentsClassrooms };
            }
            catch (error) {
                return { status: 500, message: error.message };
            }
        });
    }
    findOneById(id, body) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const teacher = yield this.teacherByUser(body === null || body === void 0 ? void 0 : body.user.user);
                const isAdminSupervisor = teacher.person.category.id === personCategories_1.personCategories.ADMINISTRADOR || teacher.person.category.id === personCategories_1.personCategories.SUPERVISOR;
                const teacherClasses = yield this.teacherClassrooms(body === null || body === void 0 ? void 0 : body.user);
                const preStudent = yield this.student(Number(id));
                if (!preStudent) {
                    return { status: 404, message: 'Registro não encontrado' };
                }
                const student = this.formartStudentResponse(preStudent);
                if (teacherClasses.classrooms.length > 0 &&
                    !teacherClasses.classrooms.includes(student.classroom.id) &&
                    !isAdminSupervisor) {
                    return { status: 403, message: 'Você não tem permissão para acessar esse registro.' };
                }
                return { status: 200, data: student };
            }
            catch (error) {
                return { status: 500, message: error.message };
            }
        });
    }
    save(body) {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const teacher = yield this.teacherByUser(body.user.user);
                const teacherClasses = yield this.teacherClassrooms(body.user);
                const year = yield this.currentYear();
                const state = yield this.state(body.state);
                const classroom = yield this.classroom(body.classroom);
                const category = yield this.studentCategory();
                const disabilities = yield this.disabilities(body.disabilities);
                const person = this.createPerson({ name: body.name, birth: body.birth, category });
                if (!year) {
                    return { status: 404, message: 'Não existe um ano letivo ativo. Entre em contato com o Administrador do sistema.' };
                }
                const exists = yield data_source_1.AppDataSource.getRepository(Student_1.Student).findOne({ where: { ra: body.ra, dv: body.dv } });
                if (exists) {
                    const lastStudentRegister = yield data_source_1.AppDataSource.getRepository(Student_1.Student)
                        .createQueryBuilder('student')
                        .leftJoinAndSelect('student.person', 'person')
                        .leftJoinAndSelect('student.studentClassrooms', 'studentClassroom')
                        .leftJoinAndSelect('studentClassroom.classroom', 'classroom')
                        .leftJoinAndSelect('classroom.school', 'school')
                        .leftJoinAndSelect('studentClassroom.year', 'year')
                        .where('student.ra = :ra', { ra: body.ra })
                        .andWhere('student.dv = :dv', { dv: body.dv })
                        .andWhere(new typeorm_1.Brackets(qb => {
                        qb.where('studentClassroom.endedAt IS NULL')
                            .orWhere('studentClassroom.endedAt < :currentDate', { currentDate: new Date() });
                    }))
                        .getOne();
                    let preResult;
                    const activeStudentClassroom = lastStudentRegister.studentClassrooms.find(sc => sc.endedAt === null);
                    if (activeStudentClassroom) {
                        preResult = activeStudentClassroom;
                    }
                    else {
                        preResult = lastStudentRegister.studentClassrooms.find(sc => (0, getTimeZone_1.default)(sc.endedAt) === Math.max(...lastStudentRegister.studentClassrooms.map(sc => (0, getTimeZone_1.default)(sc.endedAt))));
                    }
                    if (!lastStudentRegister.active) {
                        return { status: 409, message: `Já existe um aluno com o RA informado. ${lastStudentRegister.person.name} se formou em: ${preResult === null || preResult === void 0 ? void 0 : preResult.classroom.shortName} ${preResult === null || preResult === void 0 ? void 0 : preResult.classroom.school.shortName} no ano de ${preResult === null || preResult === void 0 ? void 0 : preResult.year.name}.` };
                    }
                    return { status: 409, message: `Já existe um aluno com o RA informado. ${lastStudentRegister.person.name} tem como último registro: ${preResult === null || preResult === void 0 ? void 0 : preResult.classroom.shortName} ${preResult === null || preResult === void 0 ? void 0 : preResult.classroom.school.shortName} no ano ${preResult === null || preResult === void 0 ? void 0 : preResult.year.name}. ${preResult.endedAt === null ? `Acesse o menu MATRÍCULAS ATIVAS no ano de ${preResult.year.name}.` : `Acesse o menu PASSAR DE ANO no ano de ${preResult.year.name}.`}` };
                }
                if (body.user.category === personCategories_1.personCategories.PROFESSOR) {
                    if (!teacherClasses.classrooms.includes(classroom.id)) {
                        return { status: 403, message: 'Você não tem permissão para criar um aluno neste sala.' };
                    }
                }
                const student = yield this.repository.save(this.createStudent(body, person, state));
                if (!!disabilities.length) {
                    yield data_source_1.AppDataSource.getRepository(StudentDisability_1.StudentDisability).save(disabilities.map(disability => {
                        return { student, startedAt: new Date(), disability };
                    }));
                }
                const lastRosterNumber = yield data_source_1.AppDataSource.getRepository(StudentClassroom_1.StudentClassroom)
                    .find({
                    relations: ['classroom', 'year'],
                    where: {
                        year: { id: year.id },
                        classroom: { id: classroom.id }
                    },
                    order: { rosterNumber: 'DESC' },
                    take: 1
                });
                let last = 1;
                if ((_a = lastRosterNumber[0]) === null || _a === void 0 ? void 0 : _a.rosterNumber) {
                    last = lastRosterNumber[0].rosterNumber + 1;
                }
                const studentClassroom = yield data_source_1.AppDataSource.getRepository(StudentClassroom_1.StudentClassroom).save({ student, classroom, year, rosterNumber: last, startedAt: new Date() });
                const notDigit = /\D/g;
                const classroomNumber = Number(studentClassroom.classroom.shortName.replace(notDigit, ''));
                const newTransfer = new Transfer_1.Transfer();
                newTransfer.startedAt = new Date();
                newTransfer.endedAt = new Date();
                newTransfer.requester = teacher;
                newTransfer.requestedClassroom = classroom;
                newTransfer.currentClassroom = classroom;
                newTransfer.receiver = teacher;
                newTransfer.student = student;
                newTransfer.status = (yield data_source_1.AppDataSource.getRepository(TransferStatus_1.TransferStatus).findOne({ where: { id: 5, name: 'Novo' } }));
                newTransfer.year = yield this.currentYear();
                yield data_source_1.AppDataSource.getRepository(Transfer_1.Transfer).save(newTransfer);
                if (classroomNumber >= 1 && classroomNumber <= 3) {
                    const literacyTier = yield data_source_1.AppDataSource.getRepository(LiteracyTier_1.LiteracyTier).find();
                    for (let tier of literacyTier) {
                        yield data_source_1.AppDataSource.getRepository(Literacy_1.Literacy).save({
                            studentClassroom,
                            literacyTier: tier
                        });
                    }
                }
                if (classroomNumber >= 1 && classroomNumber <= 3) {
                    const firstLiteracyLevel = new LiteracyFirst_1.LiteracyFirst();
                    firstLiteracyLevel.student = student;
                    yield data_source_1.AppDataSource.getRepository(LiteracyFirst_1.LiteracyFirst).save(firstLiteracyLevel);
                }
                if (classroomNumber === 4 || classroomNumber === 5) {
                    const textGenderExam = yield data_source_1.AppDataSource.getRepository(TextGenderExam_1.TextGenderExam).find();
                    const textGenderExamTier = yield data_source_1.AppDataSource.getRepository(TextGenderExamTier_1.TextGenderExamTier).find();
                    const textGenderClassroom = yield data_source_1.AppDataSource.getRepository(TextGenderClassroom_1.TextGenderClassroom).find({
                        where: { classroomNumber: classroomNumber },
                        relations: ['textGender']
                    });
                    for (let tg of textGenderClassroom) {
                        for (let tier of textGenderExamTier) {
                            for (let exam of textGenderExam) {
                                const textGenderGrade = new TextGenderGrade_1.TextGenderGrade();
                                textGenderGrade.studentClassroom = studentClassroom;
                                textGenderGrade.textGender = tg.textGender;
                                textGenderGrade.textGenderExam = exam;
                                textGenderGrade.textGenderExamTier = tier;
                                yield data_source_1.AppDataSource.getRepository(TextGenderGrade_1.TextGenderGrade).save(textGenderGrade);
                            }
                        }
                    }
                }
                return { status: 201, data: student };
            }
            catch (error) {
                return { status: 500, message: error.message };
            }
        });
    }
    putLiteracyBeforeLevel(body) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const classroomNumber = Number(body.studentClassroom.classroom.shortName.replace(/\D/g, ''));
                const register = yield data_source_1.AppDataSource.getRepository(LiteracyFirst_1.LiteracyFirst).findOne({
                    relations: ['literacyLevel'],
                    where: { student: { id: body.studentClassroom.student.id } }
                });
                if (!register) {
                    return { status: 404, message: 'Registro não encontrado' };
                }
                if (classroomNumber >= 1 && classroomNumber <= 3 && register && register.literacyLevel === null) {
                    register.literacyLevel = body.literacyLevel;
                    yield data_source_1.AppDataSource.getRepository(LiteracyFirst_1.LiteracyFirst).save(register);
                    return { status: 201, data: {} };
                }
                return { status: 201, data: {} };
            }
            catch (error) {
                return { status: 500, message: error.message };
            }
        });
    }
    updateId(studentId, body) {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const userTeacher = yield this.teacherByUser(body.user.user);
                const student = yield this.repository
                    .findOne({ relations: ['person', 'studentDisabilities.disability', 'state'], where: { id: Number(studentId) } });
                const bodyClassroom = yield data_source_1.AppDataSource.getRepository(Classroom_1.Classroom)
                    .findOne({ where: { id: body.classroom } });
                const arrayOfRelations = [
                    'student',
                    'classroom',
                    'literacies.literacyTier',
                    'literacies.literacyLevel',
                    'textGenderGrades.textGender',
                    'textGenderGrades.textGenderExam',
                    'textGenderGrades.textGenderExamTier',
                    'textGenderGrades.textGenderExamLevel',
                    'year'
                ];
                const studentClassroom = yield data_source_1.AppDataSource.getRepository(StudentClassroom_1.StudentClassroom)
                    .findOne({ relations: arrayOfRelations, where: { id: Number(body.currentStudentClassroomId), student: { id: student.id }, endedAt: (0, typeorm_1.IsNull)() } });
                if (!student) {
                    return { status: 404, message: 'Registro não encontrado' };
                }
                if (!studentClassroom) {
                    return { status: 404, message: 'Registro não encontrado' };
                }
                if (!bodyClassroom) {
                    return { status: 404, message: 'Sala não encontrada' };
                }
                const composedBodyStudentRa = `${body.ra}${body.dv}`;
                const composedStudentRa = `${student.ra}${student.dv}`;
                if (composedStudentRa !== composedBodyStudentRa) {
                    const exists = yield this.repository.findOne({ where: { ra: body.ra, dv: body.dv } });
                    if (exists) {
                        return { status: 409, message: 'Já existe um aluno com esse RA' };
                    }
                }
                const canChange = [personCategories_1.personCategories.ADMINISTRADOR, personCategories_1.personCategories.SUPERVISOR, personCategories_1.personCategories.DIRETOR, personCategories_1.personCategories.VICE_DIRETOR, personCategories_1.personCategories.COORDENADOR, personCategories_1.personCategories.SECRETARIO];
                if (!canChange.includes(userTeacher.person.category.id) && (studentClassroom === null || studentClassroom === void 0 ? void 0 : studentClassroom.classroom.id) != bodyClassroom.id) {
                    return { status: 403, message: 'Você não tem permissão para alterar a sala de um aluno por aqui. Crie uma solicitação de transferência no menu ALUNOS na opção OUTROS ATIVOS.' };
                }
                if ((studentClassroom === null || studentClassroom === void 0 ? void 0 : studentClassroom.classroom.id) != bodyClassroom.id && canChange.includes(userTeacher.person.category.id)) {
                    const newClassroomNumber = Number(bodyClassroom.shortName.replace(/\D/g, ''));
                    const oldClassroomNumber = Number(studentClassroom.classroom.shortName.replace(/\D/g, ''));
                    if (newClassroomNumber < oldClassroomNumber) {
                        return { status: 404, message: 'Não é possível alterar a sala para uma sala com número menor que a atual.' };
                    }
                    yield data_source_1.AppDataSource.getRepository(StudentClassroom_1.StudentClassroom).save(Object.assign(Object.assign({}, studentClassroom), { endedAt: new Date() }));
                    const currentYear = yield this.currentYear();
                    const lastRosterNumber = yield data_source_1.AppDataSource.getRepository(StudentClassroom_1.StudentClassroom)
                        .find({
                        relations: ['classroom', 'year'],
                        where: {
                            year: { id: currentYear.id },
                            classroom: { id: bodyClassroom.id }
                        },
                        order: { rosterNumber: 'DESC' },
                        take: 1
                    });
                    let last = 1;
                    if ((_a = lastRosterNumber[0]) === null || _a === void 0 ? void 0 : _a.rosterNumber) {
                        last = lastRosterNumber[0].rosterNumber + 1;
                    }
                    const newStudentClassroom = yield data_source_1.AppDataSource.getRepository(StudentClassroom_1.StudentClassroom).save({
                        student,
                        classroom: bodyClassroom,
                        year: currentYear,
                        rosterNumber: last,
                        startedAt: new Date()
                    });
                    const notDigit = /\D/g;
                    const classroomNumber = Number(bodyClassroom.shortName.replace(notDigit, ''));
                    if (classroomNumber >= 1 && classroomNumber <= 3) {
                        const literacyTier = yield data_source_1.AppDataSource.getRepository(LiteracyTier_1.LiteracyTier).find();
                        if (studentClassroom.classroom.id != newStudentClassroom.classroom.id &&
                            oldClassroomNumber === newClassroomNumber &&
                            studentClassroom.year.id === newStudentClassroom.year.id) {
                            for (let tier of literacyTier) {
                                const element = studentClassroom.literacies.find(el => el.literacyTier.id === tier.id && el.literacyLevel != null);
                                if (element) {
                                    yield data_source_1.AppDataSource.getRepository(Literacy_1.Literacy).save({
                                        studentClassroom: newStudentClassroom,
                                        literacyTier: element.literacyTier,
                                        literacyLevel: element.literacyLevel,
                                        toRate: false
                                    });
                                }
                                else {
                                    yield data_source_1.AppDataSource.getRepository(Literacy_1.Literacy).save({
                                        studentClassroom: newStudentClassroom,
                                        literacyTier: tier
                                    });
                                }
                            }
                        }
                        else {
                            for (let tier of literacyTier) {
                                yield data_source_1.AppDataSource.getRepository(Literacy_1.Literacy).save({
                                    studentClassroom: newStudentClassroom,
                                    literacyTier: tier
                                });
                            }
                        }
                    }
                    if (classroomNumber === 4 || classroomNumber === 5) {
                        const textGenderExam = yield data_source_1.AppDataSource.getRepository(TextGenderExam_1.TextGenderExam).find();
                        const textGenderExamTier = yield data_source_1.AppDataSource.getRepository(TextGenderExamTier_1.TextGenderExamTier).find();
                        const textGenderClassroom = yield data_source_1.AppDataSource.getRepository(TextGenderClassroom_1.TextGenderClassroom).find({
                            where: { classroomNumber: classroomNumber },
                            relations: ['textGender']
                        });
                        if (studentClassroom.classroom.id != newStudentClassroom.classroom.id &&
                            oldClassroomNumber === newClassroomNumber &&
                            studentClassroom.year.id === newStudentClassroom.year.id) {
                            for (let tg of textGenderClassroom) {
                                for (let tier of textGenderExamTier) {
                                    for (let exam of textGenderExam) {
                                        const element = studentClassroom.textGenderGrades.find(el => el.textGender.id === tg.textGender.id && el.textGenderExam.id === exam.id && el.textGenderExamTier.id === tier.id && el.textGenderExamLevel != null);
                                        if (element) {
                                            yield data_source_1.AppDataSource.getRepository(TextGenderGrade_1.TextGenderGrade).save({
                                                studentClassroom: newStudentClassroom,
                                                textGender: element.textGender,
                                                textGenderExam: element.textGenderExam,
                                                textGenderExamTier: element.textGenderExamTier,
                                                textGenderExamLevel: element.textGenderExamLevel,
                                                toRate: false
                                            });
                                        }
                                        else {
                                            yield data_source_1.AppDataSource.getRepository(TextGenderGrade_1.TextGenderGrade).save({
                                                studentClassroom: newStudentClassroom,
                                                textGender: tg.textGender,
                                                textGenderExam: exam,
                                                textGenderExamTier: tier
                                            });
                                        }
                                    }
                                }
                            }
                        }
                        else {
                            for (let tg of textGenderClassroom) {
                                for (let tier of textGenderExamTier) {
                                    for (let exam of textGenderExam) {
                                        yield data_source_1.AppDataSource.getRepository(TextGenderGrade_1.TextGenderGrade).save({
                                            studentClassroom: newStudentClassroom,
                                            textGender: tg.textGender,
                                            textGenderExam: exam,
                                            textGenderExamTier: tier
                                        });
                                    }
                                }
                            }
                        }
                    }
                    const newTransfer = new Transfer_1.Transfer();
                    newTransfer.startedAt = new Date();
                    newTransfer.endedAt = new Date();
                    newTransfer.requester = userTeacher;
                    newTransfer.requestedClassroom = bodyClassroom;
                    newTransfer.currentClassroom = studentClassroom.classroom;
                    newTransfer.receiver = userTeacher;
                    newTransfer.student = student;
                    newTransfer.status = (yield data_source_1.AppDataSource.getRepository(TransferStatus_1.TransferStatus).findOne({ where: { id: 1, name: 'Aceitada' } }));
                    newTransfer.year = yield this.currentYear();
                    yield data_source_1.AppDataSource.getRepository(Transfer_1.Transfer).save(newTransfer);
                }
                if (studentClassroom.classroom.id === bodyClassroom.id) {
                    yield data_source_1.AppDataSource.getRepository(StudentClassroom_1.StudentClassroom)
                        .save(Object.assign(Object.assign({}, studentClassroom), { rosterNumber: body.rosterNumber }));
                }
                student.ra = body.ra;
                student.dv = body.dv;
                student.state = yield this.state(body.state);
                student.observationOne = body.observationOne;
                student.observationTwo = body.observationTwo;
                student.person.name = body.name;
                student.person.birth = body.birth;
                const register = yield this.repository.save(student);
                const stDisabilities = student.studentDisabilities
                    .filter((studentDisability) => !studentDisability.endedAt);
                yield this.setDisabilities(register, stDisabilities, body.disabilities);
                const preResult = yield this.student(Number(studentId));
                const result = this.formartStudentResponse(preResult);
                return { status: 200, data: result };
            }
            catch (error) {
                return { status: 500, message: error.message };
            }
        });
    }
    setDisabilities(student, studentDisabilities, body) {
        return __awaiter(this, void 0, void 0, function* () {
            const currentDisabilities = studentDisabilities.map((studentDisability) => studentDisability.disability.id);
            const create = body.filter((disabilityId) => !currentDisabilities.includes(disabilityId));
            if (create.length) {
                yield data_source_1.AppDataSource.getRepository(StudentDisability_1.StudentDisability).save(create.map(disabilityId => {
                    return { student, disability: { id: disabilityId }, startedAt: new Date() };
                }));
            }
            const remove = currentDisabilities.filter((disabilityId) => !body.includes(disabilityId));
            if (remove.length) {
                for (let item of remove) {
                    const studentDisability = studentDisabilities.find((studentDisability) => studentDisability.disability.id === item);
                    if (studentDisability) {
                        studentDisability.endedAt = new Date();
                        yield data_source_1.AppDataSource.getRepository(StudentDisability_1.StudentDisability).save(studentDisability);
                    }
                }
            }
        });
    }
    studentCategory() {
        return __awaiter(this, void 0, void 0, function* () {
            return yield data_source_1.AppDataSource.getRepository(PersonCategory_1.PersonCategory).findOne({ where: { id: personCategories_1.personCategories.ALUNO } });
        });
    }
    disabilities(ids) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield data_source_1.AppDataSource.getRepository(Disability_1.Disability).findBy({ id: (0, typeorm_1.In)(ids) });
        });
    }
    student(studentId) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield data_source_1.AppDataSource
                .createQueryBuilder()
                .select([
                'student.id',
                'student.ra',
                'student.dv',
                'student.observationOne',
                'student.observationTwo',
                'state.id',
                'state.acronym',
                'person.id',
                'person.name',
                'person.birth',
                'studentClassroom.id',
                'studentClassroom.rosterNumber',
                'studentClassroom.startedAt',
                'studentClassroom.endedAt',
                'classroom.id',
                'classroom.shortName',
                'school.id',
                'school.shortName',
                'GROUP_CONCAT(DISTINCT disability.id ORDER BY disability.id ASC) AS disabilities',
            ])
                .from(Student_1.Student, 'student')
                .leftJoin('student.person', 'person')
                .leftJoin('student.studentDisabilities', 'studentDisabilities', 'studentDisabilities.endedAt IS NULL')
                .leftJoin('studentDisabilities.disability', 'disability')
                .leftJoin('student.state', 'state')
                .leftJoin('student.studentClassrooms', 'studentClassroom', 'studentClassroom.endedAt IS NULL')
                .leftJoin('studentClassroom.classroom', 'classroom')
                .leftJoin('classroom.school', 'school')
                .where('student.id = :studentId', { studentId })
                .groupBy('studentClassroom.id')
                .getRawOne();
        });
    }
    studentsClassrooms(options, isAdminSupervisor) {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            const isOwner = options.owner === owner_1.ISOWNER.OWNER;
            const yearName = (_a = options.year) !== null && _a !== void 0 ? _a : (yield this.currentYear()).name;
            let allClassrooms = [];
            if (isAdminSupervisor) {
                allClassrooms = (yield data_source_1.AppDataSource.getRepository(Classroom_1.Classroom).find());
            }
            const queryBuilder = data_source_1.AppDataSource.createQueryBuilder();
            queryBuilder
                .select([
                'studentClassroom.id',
                'studentClassroom.rosterNumber',
                'studentClassroom.startedAt',
                'studentClassroom.endedAt',
                'student.id',
                'student.ra',
                'student.dv',
                'state.id',
                'state.acronym',
                'person.id',
                'person.name',
                'person.birth',
                'classroom.id',
                'classroom.shortName',
                'school.id',
                'school.shortName',
                'transfers.id',
                'transfers.startedAt',
                'requesterPerson.name',
                'transfersStatus.name'
            ])
                .from(Student_1.Student, 'student')
                .leftJoin('student.person', 'person')
                .leftJoin('student.state', 'state')
                .leftJoin('student.transfers', 'transfers', 'transfers.endedAt IS NULL')
                .leftJoin('transfers.status', 'transfersStatus')
                .leftJoin('transfers.requester', 'requester')
                .leftJoin('requester.person', 'requesterPerson')
                .leftJoin('student.studentClassrooms', 'studentClassroom', 'studentClassroom.endedAt IS NULL')
                .leftJoin('studentClassroom.classroom', 'classroom')
                .leftJoin('classroom.school', 'school')
                .leftJoin('studentClassroom.year', 'year')
                .where('year.name = :yearName', { yearName })
                .andWhere(new typeorm_1.Brackets(qb => {
                qb.where('person.name LIKE :search', { search: `%${options.search}%` })
                    .orWhere('student.ra LIKE :search', { search: `%${options.search}%` });
            }))
                .andWhere(new typeorm_1.Brackets(qb => {
                var _a;
                if (!isAdminSupervisor) {
                    qb.andWhere(isOwner ? 'classroom.id IN (:...classrooms)' : 'classroom.id NOT IN (:...classrooms)', { classrooms: (_a = options.teacherClasses) === null || _a === void 0 ? void 0 : _a.classrooms });
                }
                else {
                    qb.andWhere(isOwner ? 'classroom.id IN (:...classrooms)' : 'classroom.id NOT IN (:...classrooms)', { classrooms: allClassrooms.map(classroom => classroom.id) });
                }
            }))
                .orderBy('school.shortName', 'ASC')
                .addOrderBy('classroom.shortName', 'ASC')
                .addOrderBy('person.name', 'ASC');
            const preResult = yield queryBuilder.getRawMany();
            return preResult.map((item) => {
                return {
                    id: item.studentClassroom_id,
                    rosterNumber: item.studentClassroom_rosterNumber,
                    startedAt: item.studentClassroom_startedAt,
                    endedAt: item.studentClassroom_endedAt,
                    student: {
                        id: item.student_id,
                        ra: item.student_ra,
                        dv: item.student_dv,
                        state: {
                            id: item.state_id,
                            acronym: item.state_acronym,
                        },
                        person: {
                            id: item.person_id,
                            name: item.person_name,
                            birth: item.person_birth,
                        },
                        transfer: item.transfers_id ? {
                            id: item.transfers_id,
                            startedAt: item.transfers_startedAt,
                            status: {
                                name: item.transfersStatus_name,
                            },
                            requester: {
                                name: item.requesterPerson_name,
                            }
                        } : false,
                    },
                    classroom: {
                        id: item.classroom_id,
                        shortName: item.classroom_shortName,
                        teacher: options.teacherClasses,
                        school: {
                            id: item.school_id,
                            shortName: item.school_shortName,
                        },
                    },
                };
            });
        });
    }
    createStudent(body, person, state) {
        const student = new Student_1.Student();
        student.person = person;
        student.ra = body.ra;
        student.dv = body.dv;
        student.state = state;
        student.observationOne = body.observationOne;
        student.observationTwo = body.observationTwo;
        return student;
    }
    formartStudentResponse(student) {
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
                    acronym: student.state_acronym
                },
                person: {
                    id: student.person_id,
                    name: student.person_name,
                    birth: student.person_birth,
                },
                disabilities: (_b = (_a = student.disabilities) === null || _a === void 0 ? void 0 : _a.split(',').map((disabilityId) => Number(disabilityId))) !== null && _b !== void 0 ? _b : [],
            },
            classroom: {
                id: student.classroom_id,
                shortName: student.classroom_shortName,
                school: {
                    id: student.school_id,
                    shortName: student.school_shortName,
                }
            }
        };
    }
    getOneClassroom(studentClassrooms) {
        const maxEndedAtIndex = studentClassrooms.findIndex(sc => (0, getTimeZone_1.default)(sc.endedAt) === Math.max(...studentClassrooms.map(sc => (0, getTimeZone_1.default)(sc.endedAt))));
        return studentClassrooms[maxEndedAtIndex];
    }
    graduate(studentId, body) {
        return __awaiter(this, void 0, void 0, function* () {
            const userTeacher = yield this.teacherByUser(body.user.user);
            try {
                const student = yield data_source_1.AppDataSource.getRepository(Student_1.Student).findOne({ where: { id: Number(studentId) } });
                if (!student) {
                    return { status: 404, message: 'Registro não encontrado' };
                }
                student.active = body.student.active;
                yield data_source_1.AppDataSource.getRepository(Student_1.Student).save(student);
                const newTransfer = new Transfer_1.Transfer();
                newTransfer.startedAt = new Date();
                newTransfer.endedAt = new Date();
                newTransfer.requester = userTeacher;
                newTransfer.requestedClassroom = body.student.classroom;
                newTransfer.currentClassroom = body.student.classroom;
                newTransfer.receiver = userTeacher;
                newTransfer.student = student;
                newTransfer.status = (yield data_source_1.AppDataSource.getRepository(TransferStatus_1.TransferStatus).findOne({ where: { id: 6, name: 'Formado' } }));
                newTransfer.year = (yield data_source_1.AppDataSource.getRepository(Year_1.Year).findOne({ where: { id: body.year } }));
                yield data_source_1.AppDataSource.getRepository(Transfer_1.Transfer).save(newTransfer);
                return { status: 200, data: student };
            }
            catch (error) {
                return { status: 500, message: error.message };
            }
        });
    }
}
exports.studentController = new StudentController();

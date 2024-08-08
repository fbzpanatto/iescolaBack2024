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
exports.transferController = void 0;
const data_source_1 = require("../data-source");
const genericController_1 = require("./genericController");
const typeorm_1 = require("typeorm");
const Transfer_1 = require("../model/Transfer");
const transferStatus_1 = require("../utils/transferStatus");
const StudentClassroom_1 = require("../model/StudentClassroom");
const Classroom_1 = require("../model/Classroom");
const LiteracyTier_1 = require("../model/LiteracyTier");
const Literacy_1 = require("../model/Literacy");
const Teacher_1 = require("../model/Teacher");
const email_service_1 = require("../utils/email.service");
const Student_1 = require("../model/Student");
const personCategories_1 = require("../utils/personCategories");
class TransferController extends genericController_1.GenericController {
    constructor() { super(Transfer_1.Transfer); }
    findAllWhere(options, request) {
        return __awaiter(this, void 0, void 0, function* () {
            const year = request === null || request === void 0 ? void 0 : request.params.year;
            const search = request === null || request === void 0 ? void 0 : request.query.search;
            const limit = !isNaN(parseInt(request === null || request === void 0 ? void 0 : request.query.limit)) ? parseInt(request === null || request === void 0 ? void 0 : request.query.limit) : 100;
            const offset = !isNaN(parseInt(request === null || request === void 0 ? void 0 : request.query.offset)) ? parseInt(request === null || request === void 0 ? void 0 : request.query.offset) : 0;
            try {
                return yield data_source_1.AppDataSource.transaction((CONN) => __awaiter(this, void 0, void 0, function* () {
                    const result = yield CONN.getRepository(Transfer_1.Transfer)
                        .createQueryBuilder('transfer')
                        .leftJoinAndSelect('transfer.status', 'status')
                        .leftJoin('transfer.year', 'year')
                        .leftJoinAndSelect('transfer.requester', 'requester')
                        .leftJoinAndSelect('requester.person', 'requesterPerson')
                        .leftJoinAndSelect('transfer.student', 'student')
                        .leftJoinAndSelect('student.person', 'studentPerson')
                        .leftJoinAndSelect('transfer.receiver', 'receiver')
                        .leftJoinAndSelect('receiver.person', 'receiverPerson')
                        .leftJoinAndSelect('transfer.requestedClassroom', 'requestedClassroom')
                        .leftJoinAndSelect('transfer.currentClassroom', 'currentClassroom')
                        .leftJoinAndSelect('requestedClassroom.school', 'school')
                        .leftJoinAndSelect('currentClassroom.school', 'currentSchool')
                        .where(new typeorm_1.Brackets(qb => {
                        qb.where('studentPerson.name LIKE :search', { search: `%${search}%` })
                            .orWhere('student.ra LIKE :search', { search: `%${search}%` })
                            .orWhere('requesterPerson.name LIKE :search', { search: `%${search}%` })
                            .orWhere('receiverPerson.name LIKE :search', { search: `%${search}%` });
                    }))
                        .andWhere('year.name = :year', { year })
                        .orderBy('transfer.startedAt', 'DESC')
                        .limit(limit)
                        .offset(offset)
                        .getMany();
                    return { status: 200, data: result };
                }));
            }
            catch (error) {
                return { status: 500, message: error.message };
            }
        });
    }
    save(body, options) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                return yield data_source_1.AppDataSource.transaction((CONN) => __awaiter(this, void 0, void 0, function* () {
                    const uTeacher = yield this.teacherByUser(body.user.user, CONN);
                    const dbTransfer = yield CONN.findOne(Transfer_1.Transfer, { where: { student: body.student, status: { id: transferStatus_1.transferStatus.PENDING }, endedAt: (0, typeorm_1.IsNull)() } });
                    if (dbTransfer)
                        return { status: 400, message: 'Já existe uma solicitação pendente para este aluno' };
                    const currClass = yield CONN.findOne(Classroom_1.Classroom, { where: { id: body.currentClassroom.id } });
                    const newClass = yield CONN.findOne(Classroom_1.Classroom, { relations: ['school'], where: { id: body.classroom.id } });
                    if (!currClass)
                        return { status: 404, message: 'Registro não encontrado' };
                    if (!newClass)
                        return { status: 404, message: 'Registro não encontrado' };
                    if (Number(newClass.name.replace(/\D/g, '')) < Number(currClass.name.replace(/\D/g, ''))) {
                        return { status: 400, message: 'Regressão de sala não é permitido.' };
                    }
                    const student = yield CONN.findOne(Student_1.Student, { relations: ['person'], where: { id: body.student.id } });
                    const teachers = yield CONN.getRepository(Teacher_1.Teacher)
                        .createQueryBuilder("teacher")
                        .select(["teacher.id AS teacher_id", "user.id AS user_id", "user.email AS user_email"])
                        .leftJoin("teacher.person", "person")
                        .leftJoin("person.user", "user")
                        .leftJoin("person.category", "category")
                        .leftJoin("teacher.teacherClassDiscipline", "teacherClassDiscipline")
                        .leftJoin("teacherClassDiscipline.classroom", "classroom")
                        .where("classroom.id = :classroomId AND teacherClassDiscipline.endedAt IS NULL", { classroomId: currClass.id })
                        .andWhere("category.id IN (:categoryId1)", { categoryId1: 6 })
                        // .andWhere("category.id IN (:categoryId1, :categoryId2)", { categoryId1: 6, categoryId2: 8 })
                        .groupBy("teacher.id")
                        .orderBy("teacher_id")
                        .getRawMany();
                    for (let el of teachers) {
                        if (student) {
                            yield (0, email_service_1.transferEmail)(el.user_email, student.person.name, newClass.shortName, uTeacher.person.name, newClass.school.shortName);
                        }
                    }
                    const transfer = new Transfer_1.Transfer();
                    transfer.student = body.student;
                    transfer.startedAt = body.startedAt;
                    transfer.endedAt = body.endedAt;
                    transfer.requester = uTeacher;
                    transfer.requestedClassroom = body.classroom;
                    transfer.year = yield this.currentYear(CONN);
                    transfer.currentClassroom = body.currentClassroom;
                    transfer.createdByUser = uTeacher.person.user.id;
                    transfer.status = (yield this.transferStatus(transferStatus_1.transferStatus.PENDING, CONN));
                    const result = yield CONN.save(Transfer_1.Transfer, transfer);
                    return { status: 201, data: result };
                }));
            }
            catch (error) {
                return { status: 500, message: error.message };
            }
        });
    }
    updateId(transferId, body) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                return yield data_source_1.AppDataSource.transaction((CONN) => __awaiter(this, void 0, void 0, function* () {
                    var _a;
                    const uTeacher = yield this.teacherByUser(body.user.user, CONN);
                    const currTransfer = yield CONN.findOne(Transfer_1.Transfer, {
                        relations: ['status', 'requester.person', 'requestedClassroom'],
                        where: { id: Number(transferId), status: { id: transferStatus_1.transferStatus.PENDING }, endedAt: (0, typeorm_1.IsNull)() }
                    });
                    const isAdmin = uTeacher.person.category.id === personCategories_1.pc.ADMN;
                    if (!currTransfer)
                        return { status: 404, message: 'Transferência já processada ou não localizada. Atualize sua página.' };
                    if (body.cancel && !(isAdmin || uTeacher.id === currTransfer.requester.id)) {
                        return { status: 403, message: 'Você não pode modificar uma solicitação de transferência feita por outra pessoa.' };
                    }
                    if (body.reject && ![personCategories_1.pc.ADMN, personCategories_1.pc.SUPE, personCategories_1.pc.SECR].includes(uTeacher.person.category.id)) {
                        return { status: 403, message: 'O seu cargo não permite realizar a RECUSA de uma solicitação de transferência. Solicite ao auxiliar administrativo da unidade escolar.' };
                    }
                    if (body.accept && ![personCategories_1.pc.ADMN, personCategories_1.pc.SUPE, personCategories_1.pc.SECR].includes(uTeacher.person.category.id)) {
                        return { status: 403, message: 'O seu cargo não permite realizar o ACEITE de uma solicitação de transferência. Solicite ao auxiliar administrativo da unidade escolar.' };
                    }
                    if (body.cancel) {
                        currTransfer.status = (yield this.transferStatus(transferStatus_1.transferStatus.CANCELED, CONN));
                        currTransfer.endedAt = new Date();
                        currTransfer.receiver = uTeacher;
                        currTransfer.updatedByUser = uTeacher.person.user.id;
                        yield CONN.save(Transfer_1.Transfer, currTransfer);
                        return { status: 200, data: 'Cancelada com sucesso.' };
                    }
                    if (body.reject) {
                        currTransfer.status = (yield this.transferStatus(transferStatus_1.transferStatus.REFUSED, CONN));
                        currTransfer.endedAt = new Date();
                        currTransfer.receiver = uTeacher;
                        currTransfer.updatedByUser = uTeacher.person.user.id;
                        yield CONN.save(Transfer_1.Transfer, currTransfer);
                        return { status: 200, data: 'Rejeitada com sucesso.' };
                    }
                    if (body.accept) {
                        const relations = ['student', 'classroom', 'literacies.literacyTier', 'literacies.literacyLevel', 'textGenderGrades.textGender', 'textGenderGrades.textGenderExam', 'textGenderGrades.textGenderExamTier', 'textGenderGrades.textGenderExamLevel', 'year'];
                        const stClass = yield CONN.findOne(StudentClassroom_1.StudentClassroom, { relations: relations, where: { student: body.student, classroom: body.classroom, endedAt: (0, typeorm_1.IsNull)() } });
                        if (!stClass) {
                            return { status: 404, message: 'Registro não encontrado.' };
                        }
                        const currentYear = yield this.currentYear(CONN);
                        const lastRosterNumber = yield CONN.find(StudentClassroom_1.StudentClassroom, { relations: ['classroom', 'year'], where: { year: { id: currentYear.id }, classroom: { id: currTransfer.requestedClassroom.id } }, order: { rosterNumber: 'DESC' }, take: 1 });
                        let last = 1;
                        if ((_a = lastRosterNumber[0]) === null || _a === void 0 ? void 0 : _a.rosterNumber) {
                            last = lastRosterNumber[0].rosterNumber + 1;
                        }
                        const newStudentClassroom = yield CONN.save(StudentClassroom_1.StudentClassroom, {
                            student: body.student,
                            classroom: currTransfer.requestedClassroom,
                            startedAt: new Date(),
                            rosterNumber: last,
                            createdByUser: uTeacher.person.user.id,
                            year: yield this.currentYear(CONN)
                        });
                        const classNumber = Number(currTransfer.requestedClassroom.shortName.replace(/\D/g, ''));
                        const newNumber = Number(newStudentClassroom.classroom.shortName.replace(/\D/g, ''));
                        const oldNumber = Number(stClass.classroom.shortName.replace(/\D/g, ''));
                        if (classNumber === 1) {
                            const literacyTier = yield CONN.find(LiteracyTier_1.LiteracyTier);
                            if (stClass.classroom.id != newStudentClassroom.classroom.id && oldNumber === newNumber && stClass.year.id === newStudentClassroom.year.id) {
                                for (let tier of literacyTier) {
                                    const element = stClass.literacies.find(el => el.literacyTier.id === tier.id && el.literacyLevel != null);
                                    if (element) {
                                        yield CONN.save(Literacy_1.Literacy, { studentClassroom: newStudentClassroom, literacyTier: element.literacyTier, literacyLevel: element.literacyLevel, toRate: false });
                                    }
                                    else {
                                        yield CONN.save(Literacy_1.Literacy, { studentClassroom: newStudentClassroom, literacyTier: tier });
                                    }
                                }
                            }
                            else {
                                for (let tier of literacyTier) {
                                    yield CONN.save(Literacy_1.Literacy, { studentClassroom: newStudentClassroom, literacyTier: tier });
                                }
                            }
                        }
                        yield CONN.save(StudentClassroom_1.StudentClassroom, Object.assign(Object.assign({}, stClass), { endedAt: new Date(), updatedByUser: uTeacher.person.user.id }));
                        currTransfer.status = (yield this.transferStatus(transferStatus_1.transferStatus.ACCEPTED, CONN));
                        currTransfer.endedAt = new Date();
                        currTransfer.receiver = uTeacher;
                        yield CONN.save(Transfer_1.Transfer, currTransfer);
                        return { status: 200, data: 'Aceita com sucesso.' };
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
}
exports.transferController = new TransferController();

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
const TextGenderExam_1 = require("../model/TextGenderExam");
const TextGenderExamTier_1 = require("../model/TextGenderExamTier");
const TextGenderClassroom_1 = require("../model/TextGenderClassroom");
const TextGenderGrade_1 = require("../model/TextGenderGrade");
class TransferController extends genericController_1.GenericController {
    constructor() { super(Transfer_1.Transfer); }
    findAllWhere(options, request) {
        return __awaiter(this, void 0, void 0, function* () {
            const year = request === null || request === void 0 ? void 0 : request.params.year;
            const search = request === null || request === void 0 ? void 0 : request.query.search;
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
                    const dataBaseTransfer = yield CONN.findOne(Transfer_1.Transfer, { where: { student: body.student, status: { id: transferStatus_1.transferStatus.PENDING }, endedAt: (0, typeorm_1.IsNull)() } });
                    if (dataBaseTransfer)
                        return { status: 400, message: 'Já existe uma solicitação pendente para este aluno' };
                    const currentClassroom = yield CONN.findOne(Classroom_1.Classroom, { where: { id: body.currentClassroom.id } });
                    const requestedClassroom = yield CONN.findOne(Classroom_1.Classroom, { where: { id: body.classroom.id } });
                    if (!currentClassroom)
                        return { status: 404, message: 'Registro não encontrado' };
                    if (!requestedClassroom)
                        return { status: 404, message: 'Registro não encontrado' };
                    if (Number(requestedClassroom.name.replace(/\D/g, '')) < Number(currentClassroom.name.replace(/\D/g, ''))) {
                        return { status: 400, message: 'Regressão de sala não é permitido.' };
                    }
                    const transfer = new Transfer_1.Transfer();
                    transfer.student = body.student;
                    transfer.startedAt = body.startedAt;
                    transfer.endedAt = body.endedAt;
                    transfer.requester = uTeacher;
                    transfer.requestedClassroom = body.classroom;
                    transfer.year = yield this.currentYear(CONN);
                    transfer.currentClassroom = body.currentClassroom;
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
    updateId(id, body) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                return yield data_source_1.AppDataSource.transaction((CONN) => __awaiter(this, void 0, void 0, function* () {
                    var _a;
                    const uTeacher = yield this.teacherByUser(body.user.user, CONN);
                    const transfer = yield CONN.findOne(Transfer_1.Transfer, { relations: ['status', 'requester.person', 'requestedClassroom'], where: { id: Number(id) } });
                    if (!transfer)
                        return { status: 404, message: 'Registro não encontrado.' };
                    if (uTeacher.id !== transfer.requester.id && body.cancel) {
                        return { status: 403, message: 'Você não tem permissão para alterar este registro.' };
                    }
                    if (body.cancel) {
                        transfer.status = (yield this.transferStatus(transferStatus_1.transferStatus.CANCELED, CONN));
                        transfer.endedAt = new Date();
                        yield CONN.save(Transfer_1.Transfer, transfer);
                        return { status: 200, data: 'Cancelada com sucesso.' };
                    }
                    if (body.reject) {
                        transfer.status = (yield this.transferStatus(transferStatus_1.transferStatus.REFUSED, CONN));
                        transfer.endedAt = new Date();
                        transfer.receiver = uTeacher;
                        yield CONN.save(Transfer_1.Transfer, transfer);
                        return { status: 200, data: 'Rejeitada com sucesso.' };
                    }
                    if (body.accept) {
                        const arrayOfRelations = ['student', 'classroom', 'literacies.literacyTier', 'literacies.literacyLevel', 'textGenderGrades.textGender', 'textGenderGrades.textGenderExam', 'textGenderGrades.textGenderExamTier', 'textGenderGrades.textGenderExamLevel', 'year'];
                        const stClass = yield CONN.findOne(StudentClassroom_1.StudentClassroom, { relations: arrayOfRelations, where: { student: body.student, classroom: body.classroom, endedAt: (0, typeorm_1.IsNull)() } });
                        if (!stClass) {
                            return { status: 404, message: 'Registro não encontrado.' };
                        }
                        const currentYear = yield this.currentYear(CONN);
                        const lastRosterNumber = yield CONN.find(StudentClassroom_1.StudentClassroom, { relations: ['classroom', 'year'], where: { year: { id: currentYear.id }, classroom: { id: transfer.requestedClassroom.id } }, order: { rosterNumber: 'DESC' }, take: 1 });
                        let last = 1;
                        if ((_a = lastRosterNumber[0]) === null || _a === void 0 ? void 0 : _a.rosterNumber) {
                            last = lastRosterNumber[0].rosterNumber + 1;
                        }
                        const newStudentClassroom = yield CONN.save(StudentClassroom_1.StudentClassroom, { student: body.student, classroom: transfer.requestedClassroom, startedAt: new Date(), rosterNumber: last, year: yield this.currentYear(CONN) });
                        const classNumber = Number(transfer.requestedClassroom.shortName.replace(/\D/g, ''));
                        const newNumber = Number(newStudentClassroom.classroom.shortName.replace(/\D/g, ''));
                        const oldNumber = Number(stClass.classroom.shortName.replace(/\D/g, ''));
                        if (classNumber >= 1 && classNumber <= 3) {
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
                        if (classNumber === 4 || classNumber === 5) {
                            const textGenderExam = yield CONN.find(TextGenderExam_1.TextGenderExam);
                            const textGenderExamTier = yield CONN.find(TextGenderExamTier_1.TextGenderExamTier);
                            const textGenderClassroom = yield CONN.find(TextGenderClassroom_1.TextGenderClassroom, { where: { classroomNumber: classNumber }, relations: ['textGender'] });
                            if (stClass.classroom.id != newStudentClassroom.classroom.id && oldNumber === newNumber && stClass.year.id === newStudentClassroom.year.id) {
                                for (let tg of textGenderClassroom) {
                                    for (let tier of textGenderExamTier) {
                                        for (let exam of textGenderExam) {
                                            const element = stClass.textGenderGrades.find(el => el.textGender.id === tg.textGender.id && el.textGenderExam.id === exam.id && el.textGenderExamTier.id === tier.id && el.textGenderExamLevel != null);
                                            if (element) {
                                                yield CONN.save(TextGenderGrade_1.TextGenderGrade, { studentClassroom: newStudentClassroom, textGender: element.textGender, textGenderExam: element.textGenderExam, textGenderExamTier: element.textGenderExamTier, textGenderExamLevel: element.textGenderExamLevel, toRate: false });
                                            }
                                            else {
                                                yield CONN.save(TextGenderGrade_1.TextGenderGrade, { studentClassroom: newStudentClassroom, textGender: tg.textGender, textGenderExam: exam, textGenderExamTier: tier });
                                            }
                                        }
                                    }
                                }
                            }
                            else {
                                for (let tg of textGenderClassroom) {
                                    for (let tier of textGenderExamTier) {
                                        for (let exam of textGenderExam) {
                                            yield CONN.save(TextGenderGrade_1.TextGenderGrade, { studentClassroom: newStudentClassroom, textGender: tg.textGender, textGenderExam: exam, textGenderExamTier: tier });
                                        }
                                    }
                                }
                            }
                        }
                        yield CONN.save(StudentClassroom_1.StudentClassroom, Object.assign(Object.assign({}, stClass), { endedAt: new Date() }));
                        transfer.status = (yield this.transferStatus(transferStatus_1.transferStatus.ACCEPTED, CONN));
                        transfer.endedAt = new Date();
                        transfer.receiver = uTeacher;
                        yield CONN.save(Transfer_1.Transfer, transfer);
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

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
const data_source_1 = require("./../data-source");
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
                const result = yield data_source_1.AppDataSource.getRepository(Transfer_1.Transfer)
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
            }
            catch (error) {
                return { status: 500, message: error.message };
            }
        });
    }
    save(body, options) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const teacher = yield this.teacherByUser(body.user.user);
                const transferInDatabse = yield data_source_1.AppDataSource.getRepository(Transfer_1.Transfer).findOne({
                    where: {
                        student: body.student,
                        status: { id: transferStatus_1.transferStatus.PENDING },
                        endedAt: (0, typeorm_1.IsNull)()
                    }
                });
                if (transferInDatabse)
                    return { status: 400, message: 'Já existe uma solicitação pendente para este aluno' };
                const currentClassroom = yield data_source_1.AppDataSource.getRepository(Classroom_1.Classroom).findOne({ where: { id: body.currentClassroom.id } });
                const requestedClassroom = yield data_source_1.AppDataSource.getRepository(Classroom_1.Classroom).findOne({ where: { id: body.classroom.id } });
                if (!currentClassroom)
                    return { status: 404, message: 'Registro não encontrado' };
                if (!requestedClassroom)
                    return { status: 404, message: 'Registro não encontrado' };
                const notDigit = /\D/g;
                if (Number(requestedClassroom.name.replace(notDigit, '')) < Number(currentClassroom.name.replace(notDigit, ''))) {
                    return { status: 400, message: 'Regressão de sala não é permitido.' };
                }
                const transfer = new Transfer_1.Transfer();
                transfer.student = body.student;
                transfer.startedAt = body.startedAt;
                transfer.endedAt = body.endedAt;
                transfer.requester = teacher;
                transfer.requestedClassroom = body.classroom;
                transfer.year = yield this.currentYear();
                transfer.currentClassroom = body.currentClassroom;
                transfer.status = yield this.transferStatus(transferStatus_1.transferStatus.PENDING);
                const result = yield this.repository.save(transfer);
                return { status: 201, data: result };
            }
            catch (error) {
                return { status: 500, message: error.message };
            }
        });
    }
    updateId(id, body) {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const teacher = yield this.teacherByUser(body.user.user);
                const transfer = yield data_source_1.AppDataSource.getRepository(Transfer_1.Transfer).findOne({
                    relations: ['status', 'requester.person', 'requestedClassroom'],
                    where: { id: Number(id) }
                });
                if (!transfer)
                    return { status: 404, message: 'Registro não encontrado.' };
                if (teacher.id !== transfer.requester.id && body.cancel) {
                    return { status: 403, message: 'Você não tem permissão para alterar este registro.' };
                }
                if (body.cancel) {
                    transfer.status = yield this.transferStatus(transferStatus_1.transferStatus.CANCELED);
                    transfer.endedAt = new Date();
                    yield data_source_1.AppDataSource.getRepository(Transfer_1.Transfer).save(transfer);
                    return { status: 200, data: 'Cancelada com sucesso.' };
                }
                if (body.reject) {
                    transfer.status = yield this.transferStatus(transferStatus_1.transferStatus.REFUSED);
                    transfer.endedAt = new Date();
                    transfer.receiver = teacher;
                    yield data_source_1.AppDataSource.getRepository(Transfer_1.Transfer).save(transfer);
                    return { status: 200, data: 'Rejeitada com sucesso.' };
                }
                if (body.accept) {
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
                        .findOne({
                        relations: arrayOfRelations,
                        where: { student: body.student, classroom: body.classroom, endedAt: (0, typeorm_1.IsNull)() }
                    });
                    if (!studentClassroom) {
                        return { status: 404, message: 'Registro não encontrado.' };
                    }
                    const currentYear = yield this.currentYear();
                    const lastRosterNumber = yield data_source_1.AppDataSource.getRepository(StudentClassroom_1.StudentClassroom)
                        .find({
                        relations: ['classroom', 'year'],
                        where: {
                            year: { id: currentYear.id },
                            classroom: { id: transfer.requestedClassroom.id }
                        },
                        order: { rosterNumber: 'DESC' },
                        take: 1
                    });
                    let last = 1;
                    if ((_a = lastRosterNumber[0]) === null || _a === void 0 ? void 0 : _a.rosterNumber) {
                        last = lastRosterNumber[0].rosterNumber + 1;
                    }
                    const newStudentClassroom = yield data_source_1.AppDataSource.getRepository(StudentClassroom_1.StudentClassroom).save({
                        student: body.student,
                        classroom: transfer.requestedClassroom,
                        startedAt: new Date(),
                        rosterNumber: last,
                        year: yield this.currentYear()
                    });
                    const notDigit = /\D/g;
                    const classroomNumber = Number(transfer.requestedClassroom.shortName.replace(notDigit, ''));
                    const newClassroomNumber = Number(newStudentClassroom.classroom.shortName.replace(notDigit, ''));
                    const oldClassroomNumber = Number(studentClassroom.classroom.shortName.replace(notDigit, ''));
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
                    yield data_source_1.AppDataSource.getRepository(StudentClassroom_1.StudentClassroom).save(Object.assign(Object.assign({}, studentClassroom), { endedAt: new Date() }));
                    transfer.status = yield this.transferStatus(transferStatus_1.transferStatus.ACCEPTED);
                    transfer.endedAt = new Date();
                    transfer.receiver = teacher;
                    yield data_source_1.AppDataSource.getRepository(Transfer_1.Transfer).save(transfer);
                    return { status: 200, data: 'Aceita com sucesso.' };
                }
                let result = {};
                return { status: 200, data: result };
            }
            catch (error) {
                return { status: 500, message: error.message };
            }
        });
    }
}
exports.transferController = new TransferController();

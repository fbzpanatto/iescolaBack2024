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
exports.teacherController = void 0;
const data_source_1 = require("../data-source");
const genericController_1 = require("./genericController");
const typeorm_1 = require("typeorm");
const PersonCategory_1 = require("../model/PersonCategory");
const Classroom_1 = require("../model/Classroom");
const Discipline_1 = require("../model/Discipline");
const Teacher_1 = require("../model/Teacher");
const TeacherClassDiscipline_1 = require("../model/TeacherClassDiscipline");
const teacherClassDiscipline_1 = require("./teacherClassDiscipline");
const User_1 = require("../model/User");
const StudentClassroom_1 = require("../model/StudentClassroom");
const transferStatus_1 = require("../utils/transferStatus");
const discipline_1 = require("./discipline");
const classroom_1 = require("./classroom");
const personCategories_1 = require("../utils/personCategories");
const personCategory_1 = require("./personCategory");
const email_service_1 = require("../utils/email.service");
const generatePassword_1 = require("../utils/generatePassword");
class TeacherController extends genericController_1.GenericController {
    constructor() { super(Teacher_1.Teacher); }
    teacherForm(req) {
        return __awaiter(this, void 0, void 0, function* () {
            let disciplines;
            let classrooms;
            let personCategories;
            try {
                yield data_source_1.AppDataSource.transaction((CONN) => __awaiter(this, void 0, void 0, function* () {
                    disciplines = (yield discipline_1.discController.getAllDisciplines(req, CONN)).data;
                    classrooms = (yield classroom_1.classroomController.getAllClassrooms(req, true, CONN)).data;
                    personCategories = (yield personCategory_1.pCatCtrl.findAllPerCat(req, CONN)).data;
                }));
                return { status: 200, data: { disciplines, classrooms, personCategories } };
            }
            catch (error) {
                return { status: 500, message: error.message };
            }
        });
    }
    findAllWhereTeacher(request) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            const search = (_a = request === null || request === void 0 ? void 0 : request.query.search) !== null && _a !== void 0 ? _a : "";
            const body = request === null || request === void 0 ? void 0 : request.body;
            try {
                return yield data_source_1.AppDataSource.transaction((CONN) => __awaiter(this, void 0, void 0, function* () {
                    const teacher = yield this.teacherByUser(body.user.user, CONN);
                    const teacherClasses = yield this.teacherClassrooms(body === null || body === void 0 ? void 0 : body.user, CONN);
                    const notInCategories = [personCategories_1.pc.ADMN, personCategories_1.pc.SUPE];
                    const newResult = yield CONN.getRepository(Teacher_1.Teacher)
                        .createQueryBuilder("teacher")
                        .leftJoinAndSelect("teacher.person", "person")
                        .leftJoinAndSelect("person.category", "category")
                        .leftJoin("teacher.teacherClassDiscipline", "teacherClassDiscipline")
                        .leftJoin("teacherClassDiscipline.classroom", "classroom")
                        .where(new typeorm_1.Brackets((qb) => {
                        if (teacher.person.category.id === personCategories_1.pc.PROF || teacher.person.category.id === personCategories_1.pc.MONI) {
                            qb.where("teacher.id = :teacherId", { teacherId: teacher.id });
                            return;
                        }
                        if (teacher.person.category.id != personCategories_1.pc.ADMN && teacher.person.category.id != personCategories_1.pc.SUPE && teacher.person.category.id != personCategories_1.pc.FORM) {
                            qb.where("category.id NOT IN (:...categoryIds)", { categoryIds: notInCategories })
                                .andWhere("classroom.id IN (:...classroomIds)", { classroomIds: teacherClasses.classrooms })
                                .andWhere("teacherClassDiscipline.endedAt IS NULL");
                            return;
                        }
                    }))
                        .andWhere("person.name LIKE :search", { search: `%${search}%` })
                        .groupBy("teacher.id")
                        .getMany();
                    return { status: 200, data: newResult };
                }));
            }
            catch (error) {
                return { status: 500, message: error.message };
            }
        });
    }
    findOneTeacher(id, request) {
        return __awaiter(this, void 0, void 0, function* () {
            const body = request === null || request === void 0 ? void 0 : request.body;
            try {
                return yield data_source_1.AppDataSource.transaction((CONN) => __awaiter(this, void 0, void 0, function* () {
                    var _a, _b, _c, _d;
                    const teacher = yield this.teacherByUser(body.user.user, CONN);
                    const cannotChange = [personCategories_1.pc.MONI, personCategories_1.pc.PROF];
                    if (teacher.id !== Number(id) && cannotChange.includes(teacher.person.category.id)) {
                        return { status: 403, message: "Você não tem permissão para visualizar este registro." };
                    }
                    const el = yield CONN.getRepository(Teacher_1.Teacher)
                        .createQueryBuilder("teacher")
                        .select("teacher.id", "teacher_id")
                        .addSelect("teacher.email", "teacher_email")
                        .addSelect("teacher.register", "teacher_register")
                        .addSelect("person.id", "person_id")
                        .addSelect("person.name", "person_name")
                        .addSelect("person.birth", "person_birth")
                        .addSelect("category.id", "category_id")
                        .addSelect("category.name", "category_name")
                        .addSelect("GROUP_CONCAT(DISTINCT classroom.id ORDER BY classroom.id ASC)", "classroom_ids")
                        .addSelect("GROUP_CONCAT(DISTINCT discipline.id ORDER BY discipline.id ASC)", "discipline_ids")
                        .leftJoin("teacher.person", "person")
                        .leftJoin("person.category", "category")
                        .leftJoin("teacher.teacherClassDiscipline", "teacherClassDiscipline")
                        .leftJoin("teacherClassDiscipline.classroom", "classroom")
                        .leftJoin("teacherClassDiscipline.discipline", "discipline")
                        .where("teacher.id = :teacherId AND teacherClassDiscipline.endedAt IS NULL", { teacherId: id })
                        .getRawOne();
                    if (!el.teacher_id) {
                        return { status: 404, message: "Dado não encontrado" };
                    }
                    let newResult = {
                        id: el.teacher_id,
                        email: el.teacher_email,
                        register: el.teacher_register,
                        person: { id: el.person_id, name: el.person_name, birth: el.person_birth, category: { id: el.category_id, name: el.category_name } },
                        teacherClasses: (_b = (_a = el.classroom_ids) === null || _a === void 0 ? void 0 : _a.split(",").map((item) => parseInt(item))) !== null && _b !== void 0 ? _b : [],
                        teacherDisciplines: (_d = (_c = el.discipline_ids) === null || _c === void 0 ? void 0 : _c.split(",").map((item) => parseInt(item))) !== null && _d !== void 0 ? _d : []
                    };
                    return { status: 200, data: newResult };
                }));
            }
            catch (error) {
                return { status: 500, message: error.message };
            }
        });
    }
    getRequestedStudentTransfers(request) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                return yield data_source_1.AppDataSource.transaction((CONN) => __awaiter(this, void 0, void 0, function* () {
                    const teacherClasses = yield this.teacherClassrooms(request === null || request === void 0 ? void 0 : request.body.user, CONN);
                    const studentClassrooms = yield CONN.getRepository(StudentClassroom_1.StudentClassroom)
                        .createQueryBuilder("studentClassroom")
                        .leftJoin("studentClassroom.classroom", "classroom")
                        .leftJoin("studentClassroom.student", "student")
                        .leftJoin("student.person", "person")
                        .leftJoin("student.transfers", "transfers")
                        .where("classroom.id IN (:...ids)", { ids: teacherClasses.classrooms })
                        .andWhere("studentClassroom.endedAt IS NULL")
                        .andWhere("transfers.endedAt IS NULL")
                        .andWhere("transfers.status = :status", { status: transferStatus_1.transferStatus.PENDING })
                        .getCount();
                    return { status: 200, data: studentClassrooms };
                }));
            }
            catch (error) {
                return { status: 500, message: error.message };
            }
        });
    }
    updateTeacher(id, body) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                return yield data_source_1.AppDataSource.transaction((CONN) => __awaiter(this, void 0, void 0, function* () {
                    const tUser = yield this.teacherByUser(body.user.user, CONN);
                    const teacher = yield CONN.findOne(Teacher_1.Teacher, { relations: ["person.category"], where: { id: Number(id) } });
                    if (!teacher) {
                        return { status: 404, message: "Data not found" };
                    }
                    const message = "Você não tem permissão para editar as informações selecionadas. Solicite a alguém com cargo superior ao seu.";
                    if (!this.canChange(tUser.person.category.id, teacher.person.category.id)) {
                        return { status: 403, message };
                    }
                    if (tUser.person.category.id === personCategories_1.pc.PROF || (tUser.person.category.id === personCategories_1.pc.MONI && tUser.id !== teacher.id)) {
                        return { status: 403, message: "Você não tem permissão para editar este registro." };
                    }
                    teacher.person.name = body.name;
                    teacher.person.birth = body.birth;
                    teacher.updatedAt = new Date();
                    teacher.updatedByUser = tUser.person.user.id;
                    if (teacher.person.category.id === personCategories_1.pc.ADMN || teacher.person.category.id === personCategories_1.pc.SUPE || teacher.person.category.id === personCategories_1.pc.FORM) {
                        yield CONN.save(Teacher_1.Teacher, teacher);
                        return { status: 200, data: teacher };
                    }
                    if (body.teacherClasses || body.teacherDisciplines) {
                        yield this.updateRelation(teacher, body, CONN);
                    }
                    yield CONN.save(Teacher_1.Teacher, teacher);
                    return { status: 200, data: teacher };
                }));
            }
            catch (error) {
                return { status: 500, message: error.message };
            }
        });
    }
    updateRelation(teacher, body, CONN) {
        return __awaiter(this, void 0, void 0, function* () {
            const tcd = yield CONN.getRepository(TeacherClassDiscipline_1.TeacherClassDiscipline)
                .find({ relations: ["teacher", "classroom", "discipline"], where: { endedAt: (0, typeorm_1.IsNull)(), teacher: { id: Number(teacher.id) } } });
            const arrOfDiff = [];
            const cBody = body.teacherClasses.map((el) => parseInt(el));
            const dBody = body.teacherDisciplines.map((el) => parseInt(el));
            const existingRelations = new Set(tcd.map((relation) => `${relation.classroom.id}-${relation.discipline.id}`));
            const requestedRelations = new Set(cBody.flatMap((classroomId) => dBody.map((disciplineId) => `${classroomId}-${disciplineId}`)));
            // Encontrar relações a serem encerradas
            for (let relation of tcd) {
                const relationKey = `${relation.classroom.id}-${relation.discipline.id}`;
                if (!requestedRelations.has(relationKey)) {
                    arrOfDiff.push(relation);
                }
            }
            // Encerrar relações que estão em arrOfDiff
            for (let relation of arrOfDiff) {
                yield teacherClassDiscipline_1.teacherRelationController.updateId(relation.id, { endedAt: new Date() }, CONN);
            }
            // Criar novas relações conforme o corpo da requisição
            for (let classroomId of cBody) {
                for (let disciplineId of dBody) {
                    const relationKey = `${classroomId}-${disciplineId}`;
                    if (!existingRelations.has(relationKey)) {
                        const el = new TeacherClassDiscipline_1.TeacherClassDiscipline();
                        el.teacher = teacher;
                        el.classroom = (yield CONN.getRepository(Classroom_1.Classroom).findOne({ where: { id: classroomId } }));
                        el.discipline = (yield CONN.getRepository(Discipline_1.Discipline).findOne({ where: { id: disciplineId } }));
                        el.startedAt = new Date();
                        yield teacherClassDiscipline_1.teacherRelationController.save(el, {}, CONN);
                    }
                }
            }
        });
    }
    saveTeacher(body) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                return yield data_source_1.AppDataSource.transaction((CONN) => __awaiter(this, void 0, void 0, function* () {
                    const teacherUserFromFront = yield this.teacherByUser(body.user.user, CONN);
                    const canChangeErr = "Você não tem permissão para criar uma pessoa com esta categoria.";
                    if (!this.canChange(teacherUserFromFront.person.category.id, body.category.id)) {
                        return { status: 403, message: canChangeErr };
                    }
                    const registerExists = yield CONN.findOne(Teacher_1.Teacher, { where: { register: body.register } });
                    const message = "Já existe um registro com este número de matrícula.";
                    if (registerExists) {
                        return { status: 409, message };
                    }
                    const emailExists = yield CONN.findOne(Teacher_1.Teacher, { where: { email: body.email } });
                    if (emailExists) {
                        return { status: 409, message: "Já existe um registro com este email." };
                    }
                    const category = (yield CONN.findOne(PersonCategory_1.PersonCategory, { where: { id: body.category.id } }));
                    const person = this.createPerson({ name: body.name, birth: body.birth, category });
                    const teacher = yield CONN.save(Teacher_1.Teacher, this.createTeacher(teacherUserFromFront.person.user.id, person, body));
                    const { username, passwordObject, email } = this.generateUser(body);
                    yield CONN.save(User_1.User, { person, username, email, password: passwordObject.hashedPassword });
                    if (body.category.id === personCategories_1.pc.ADMN || body.category.id === personCategories_1.pc.SUPE || body.category.id === personCategories_1.pc.FORM) {
                        yield (0, email_service_1.credentialsEmail)(body.email, passwordObject.password, true).catch((e) => console.log(e));
                        return { status: 201, data: teacher };
                    }
                    const classrooms = yield CONN.findBy(Classroom_1.Classroom, { id: (0, typeorm_1.In)(body.teacherClasses) });
                    const disciplines = yield CONN.findBy(Discipline_1.Discipline, { id: (0, typeorm_1.In)(body.teacherDisciplines) });
                    for (const classroom of classrooms) {
                        for (const discipline of disciplines) {
                            const el = new TeacherClassDiscipline_1.TeacherClassDiscipline();
                            el.teacher = teacher;
                            el.classroom = classroom;
                            el.discipline = discipline;
                            el.startedAt = new Date();
                            yield CONN.save(el);
                        }
                    }
                    yield (0, email_service_1.credentialsEmail)(body.email, passwordObject.password, true).catch((e) => console.log(e));
                    return { status: 201, data: teacher };
                }));
            }
            catch (error) {
                return { status: 500, message: error.message };
            }
        });
    }
    createTeacher(userId, person, body) {
        const teacher = new Teacher_1.Teacher();
        teacher.createdByUser = userId;
        teacher.createdAt = new Date();
        teacher.person = person;
        teacher.email = body.email;
        teacher.register = body.register;
        return teacher;
    }
    generateUser(body) {
        const username = body.email;
        const email = body.email;
        const passwordObject = (0, generatePassword_1.generatePassword)();
        return { username, passwordObject, email };
    }
    canChange(uCategory, tCategory) {
        const allowedCat = [personCategories_1.pc.PROF, personCategories_1.pc.MONI, personCategories_1.pc.SECR, personCategories_1.pc.COOR, personCategories_1.pc.VICE, personCategories_1.pc.DIRE, personCategories_1.pc.FORM, personCategories_1.pc.SUPE, personCategories_1.pc.ADMN,];
        let canPost = allowedCat.includes(tCategory);
        if (uCategory === personCategories_1.pc.SECR) {
            canPost = canPost && [personCategories_1.pc.PROF, personCategories_1.pc.MONI].includes(tCategory);
        }
        else if (uCategory === personCategories_1.pc.COOR) {
            canPost = canPost && [personCategories_1.pc.PROF, personCategories_1.pc.MONI, personCategories_1.pc.SECR].includes(tCategory);
        }
        else if (uCategory === personCategories_1.pc.VICE) {
            canPost = canPost && [personCategories_1.pc.PROF, personCategories_1.pc.MONI, personCategories_1.pc.SECR, personCategories_1.pc.COOR].includes(tCategory);
        }
        else if (uCategory === personCategories_1.pc.DIRE) {
            canPost = canPost && [personCategories_1.pc.PROF, personCategories_1.pc.MONI, personCategories_1.pc.SECR, personCategories_1.pc.COOR, personCategories_1.pc.VICE].includes(tCategory);
        }
        else if (uCategory === personCategories_1.pc.SUPE) {
            canPost = canPost && [personCategories_1.pc.PROF, personCategories_1.pc.MONI, personCategories_1.pc.SECR, personCategories_1.pc.COOR, personCategories_1.pc.VICE, personCategories_1.pc.DIRE, personCategories_1.pc.FORM].includes(tCategory);
        }
        else if (uCategory === personCategories_1.pc.ADMN) {
            canPost = canPost && [personCategories_1.pc.PROF, personCategories_1.pc.MONI, personCategories_1.pc.SECR, personCategories_1.pc.COOR, personCategories_1.pc.VICE, personCategories_1.pc.DIRE, personCategories_1.pc.FORM, personCategories_1.pc.SUPE].includes(tCategory);
        }
        return canPost;
    }
}
exports.teacherController = new TeacherController();

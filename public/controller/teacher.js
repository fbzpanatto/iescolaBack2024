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
const personCategories_1 = require("../utils/personCategories");
const User_1 = require("../model/User");
const StudentClassroom_1 = require("../model/StudentClassroom");
const transferStatus_1 = require("../utils/transferStatus");
class TeacherController extends genericController_1.GenericController {
    constructor() { super(Teacher_1.Teacher); }
    findAllWhere(options, request) {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            const search = (_a = request === null || request === void 0 ? void 0 : request.query.search) !== null && _a !== void 0 ? _a : '';
            const body = request === null || request === void 0 ? void 0 : request.body;
            try {
                const teacher = yield this.teacherByUser(body.user.user);
                const teacherClasses = yield this.teacherClassrooms(body === null || body === void 0 ? void 0 : body.user);
                const notInCategories = [personCategories_1.personCategories.ADMINISTRADOR, personCategories_1.personCategories.SUPERVISOR];
                const newResult = yield data_source_1.AppDataSource.getRepository(Teacher_1.Teacher)
                    .createQueryBuilder('teacher')
                    .leftJoinAndSelect('teacher.person', 'person')
                    .leftJoinAndSelect('person.category', 'category')
                    .leftJoin('teacher.teacherClassDiscipline', 'teacherClassDiscipline')
                    .leftJoin('teacherClassDiscipline.classroom', 'classroom')
                    .where(new typeorm_1.Brackets(qb => {
                    if (teacher.person.category.id === personCategories_1.personCategories.PROFESSOR) {
                        qb.where('teacher.id = :teacherId', { teacherId: teacher.id });
                        return;
                    }
                    if (teacher.person.category.id != personCategories_1.personCategories.ADMINISTRADOR && teacher.person.category.id != personCategories_1.personCategories.SUPERVISOR) {
                        qb.where('category.id NOT IN (:...categoryIds)', { categoryIds: notInCategories })
                            .andWhere('classroom.id IN (:...classroomIds)', { classroomIds: teacherClasses.classrooms })
                            .andWhere('teacherClassDiscipline.endedAt IS NULL');
                        return;
                    }
                }))
                    .andWhere('person.name LIKE :search', { search: `%${search}%` })
                    .groupBy('teacher.id')
                    .getMany();
                return { status: 200, data: newResult };
            }
            catch (error) {
                return { status: 500, message: error.message };
            }
        });
    }
    // TODO: check this
    // @ts-ignore
    findOneById(id, request) {
        var _a, _b, _c, _d;
        return __awaiter(this, void 0, void 0, function* () {
            const body = request === null || request === void 0 ? void 0 : request.body;
            try {
                const teacher = yield this.teacherByUser(body.user.user);
                const cannotChange = [personCategories_1.personCategories.MONITOR_DE_INFORMATICA, personCategories_1.personCategories.PROFESSOR];
                if (teacher.id !== Number(id) && cannotChange.includes(teacher.person.category.id)) {
                    return { status: 401, message: 'Você não tem permissão para visualizar este registro.' };
                }
                const result = yield this.repository
                    .createQueryBuilder('teacher')
                    .select('teacher.id', 'teacher_id')
                    .addSelect('teacher.email', 'teacher_email')
                    .addSelect('teacher.register', 'teacher_register')
                    .addSelect('person.id', 'person_id')
                    .addSelect('person.name', 'person_name')
                    .addSelect('person.birth', 'person_birth')
                    .addSelect('category.id', 'category_id')
                    .addSelect('category.name', 'category_name')
                    .addSelect('GROUP_CONCAT(DISTINCT classroom.id ORDER BY classroom.id ASC)', 'classroom_ids')
                    .addSelect('GROUP_CONCAT(DISTINCT discipline.id ORDER BY discipline.id ASC)', 'discipline_ids')
                    .leftJoin('teacher.person', 'person')
                    .leftJoin("person.category", "category")
                    .leftJoin('teacher.teacherClassDiscipline', 'teacherClassDiscipline')
                    .leftJoin('teacherClassDiscipline.classroom', 'classroom')
                    .leftJoin('teacherClassDiscipline.discipline', 'discipline')
                    .where('teacher.id = :teacherId AND teacherClassDiscipline.endedAt IS NULL', { teacherId: id })
                    .getRawOne();
                if (!result) {
                    return { status: 404, message: 'Data not found' };
                }
                let newResult = {
                    id: result.teacher_id,
                    email: result.teacher_email,
                    register: result.teacher_register,
                    person: {
                        id: result.person_id,
                        name: result.person_name,
                        birth: result.person_birth,
                        category: {
                            id: result.category_id,
                            name: result.category_name
                        }
                    },
                    teacherClasses: (_b = (_a = result.classroom_ids) === null || _a === void 0 ? void 0 : _a.split(',').map((item) => parseInt(item))) !== null && _b !== void 0 ? _b : [],
                    teacherDisciplines: (_d = (_c = result.discipline_ids) === null || _c === void 0 ? void 0 : _c.split(',').map((item) => parseInt(item))) !== null && _d !== void 0 ? _d : []
                };
                return { status: 200, data: newResult };
            }
            catch (error) {
                return { status: 500, message: error.message };
            }
        });
    }
    save(body, options) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const user = yield this.teacherByUser(body.user.user);
                if (body.register) {
                    const registerExists = yield data_source_1.AppDataSource.getRepository(Teacher_1.Teacher).findOne({ where: { register: body.register } });
                    if (registerExists) {
                        return { status: 409, message: 'Já existe um registro com este número de matricula.' };
                    }
                }
                if (body.email) {
                    const emailExists = yield data_source_1.AppDataSource.getRepository(Teacher_1.Teacher).findOne({ where: { email: body.email } });
                    if (emailExists) {
                        return { status: 409, message: 'Já existe um registro com este email.' };
                    }
                }
                if (user.person.category.id === personCategories_1.personCategories.SECRETARIO) {
                    const canCreate = [personCategories_1.personCategories.PROFESSOR, personCategories_1.personCategories.MONITOR_DE_INFORMATICA];
                    if (!canCreate.includes(body.category.id)) {
                        return { status: 403, message: 'Você não tem permissão para criar uma pessoa com esta categoria.' };
                    }
                }
                if (user.person.category.id === personCategories_1.personCategories.COORDENADOR) {
                    const canCreate = [personCategories_1.personCategories.PROFESSOR, personCategories_1.personCategories.MONITOR_DE_INFORMATICA, personCategories_1.personCategories.SECRETARIO];
                    if (!canCreate.includes(body.category.id)) {
                        return { status: 403, message: 'Você não tem permissão para criar uma pessoa com esta categoria.' };
                    }
                }
                if (user.person.category.id === personCategories_1.personCategories.VICE_DIRETOR) {
                    const canCreate = [personCategories_1.personCategories.PROFESSOR, personCategories_1.personCategories.MONITOR_DE_INFORMATICA, personCategories_1.personCategories.SECRETARIO, personCategories_1.personCategories.COORDENADOR];
                    if (!canCreate.includes(body.category.id)) {
                        return { status: 403, message: 'Você não tem permissão para criar uma pessoa com esta categoria.' };
                    }
                }
                if (user.person.category.id === personCategories_1.personCategories.DIRETOR) {
                    const canCreate = [personCategories_1.personCategories.PROFESSOR, personCategories_1.personCategories.MONITOR_DE_INFORMATICA, personCategories_1.personCategories.SECRETARIO, personCategories_1.personCategories.COORDENADOR, personCategories_1.personCategories.VICE_DIRETOR];
                    if (!canCreate.includes(body.category.id)) {
                        return { status: 403, message: 'Você não tem permissão para criar uma pessoa com esta categoria.' };
                    }
                }
                if (user.person.category.id === personCategories_1.personCategories.SUPERVISOR) {
                    const canCreate = [personCategories_1.personCategories.PROFESSOR, personCategories_1.personCategories.MONITOR_DE_INFORMATICA, personCategories_1.personCategories.SECRETARIO, personCategories_1.personCategories.COORDENADOR, personCategories_1.personCategories.VICE_DIRETOR, personCategories_1.personCategories.DIRETOR];
                    if (!canCreate.includes(body.category.id)) {
                        return { status: 403, message: 'Você não tem permissão para criar uma pessoa com esta categoria.' };
                    }
                }
                if (user.person.category.id === personCategories_1.personCategories.ADMINISTRADOR) {
                    const canCreate = [personCategories_1.personCategories.PROFESSOR, personCategories_1.personCategories.MONITOR_DE_INFORMATICA, personCategories_1.personCategories.SECRETARIO, personCategories_1.personCategories.COORDENADOR, personCategories_1.personCategories.VICE_DIRETOR, personCategories_1.personCategories.DIRETOR, personCategories_1.personCategories.SUPERVISOR, personCategories_1.personCategories.ADMINISTRADOR];
                    if (!canCreate.includes(body.category.id)) {
                        return { status: 403, message: 'Você não tem permissão para criar uma pessoa com esta categoria.' };
                    }
                }
                const category = yield data_source_1.AppDataSource.getRepository(PersonCategory_1.PersonCategory).findOne({ where: { id: body.category.id } });
                const person = this.createPerson({ name: body.name, birth: body.birth, category });
                const teacher = yield this.repository.save(this.createTeacher(person, body));
                const classrooms = yield data_source_1.AppDataSource.getRepository(Classroom_1.Classroom).findBy({ id: (0, typeorm_1.In)(body.teacherClasses) });
                const disciplines = yield data_source_1.AppDataSource.getRepository(Discipline_1.Discipline).findBy({ id: (0, typeorm_1.In)(body.teacherDisciplines) });
                const { username, password } = this.generateUser(person);
                yield data_source_1.AppDataSource.getRepository(User_1.User).save({ person: person, username, password });
                if (body.category.id === personCategories_1.personCategories.ADMINISTRADOR || body.category.id === personCategories_1.personCategories.SUPERVISOR) {
                    return { status: 201, data: teacher };
                }
                for (let classroom of classrooms) {
                    for (let discipline of disciplines) {
                        const teacherClassDiscipline = new TeacherClassDiscipline_1.TeacherClassDiscipline();
                        teacherClassDiscipline.teacher = teacher;
                        teacherClassDiscipline.classroom = classroom;
                        teacherClassDiscipline.discipline = discipline;
                        teacherClassDiscipline.startedAt = new Date();
                        yield teacherClassDiscipline_1.teacherClassDisciplineController.save(teacherClassDiscipline, options);
                    }
                }
                return { status: 201, data: teacher };
            }
            catch (error) {
                return { status: 500, message: error.message };
            }
        });
    }
    updateId(id, body) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const frontendTeacher = yield this.teacherByUser(body.user.user);
                const databaseTeacher = yield data_source_1.AppDataSource.getRepository(Teacher_1.Teacher).findOne({
                    relations: ['person.category'],
                    where: { id: Number(id) }
                });
                if (!databaseTeacher) {
                    return { status: 404, message: 'Data not found' };
                }
                if (frontendTeacher.person.category.id === personCategories_1.personCategories.SECRETARIO) {
                    const canEdit = [personCategories_1.personCategories.PROFESSOR, personCategories_1.personCategories.MONITOR_DE_INFORMATICA];
                    if (!canEdit.includes(databaseTeacher === null || databaseTeacher === void 0 ? void 0 : databaseTeacher.person.category.id)) {
                        return { status: 403, message: 'Você não tem permissão para editar uma pessoa dessa categoria. Solicite a alguém com cargo um cargo superior ao seu.' };
                    }
                }
                if (frontendTeacher.person.category.id === personCategories_1.personCategories.COORDENADOR) {
                    const canEdit = [personCategories_1.personCategories.PROFESSOR, personCategories_1.personCategories.MONITOR_DE_INFORMATICA, personCategories_1.personCategories.SECRETARIO];
                    if (!canEdit.includes(databaseTeacher === null || databaseTeacher === void 0 ? void 0 : databaseTeacher.person.category.id)) {
                        return { status: 403, message: 'Você não tem permissão para editar uma pessoa dessa categoria. Solicite a alguém com cargo um cargo superior ao seu.' };
                    }
                }
                if (frontendTeacher.person.category.id === personCategories_1.personCategories.VICE_DIRETOR) {
                    const canEdit = [personCategories_1.personCategories.PROFESSOR, personCategories_1.personCategories.MONITOR_DE_INFORMATICA, personCategories_1.personCategories.SECRETARIO, personCategories_1.personCategories.COORDENADOR];
                    if (!canEdit.includes(databaseTeacher === null || databaseTeacher === void 0 ? void 0 : databaseTeacher.person.category.id)) {
                        return { status: 403, message: 'Você não tem permissão para editar uma pessoa dessa categoria. Solicite a alguém com cargo um cargo superior ao seu.' };
                    }
                }
                if (frontendTeacher.person.category.id === personCategories_1.personCategories.DIRETOR) {
                    const canEdit = [personCategories_1.personCategories.PROFESSOR, personCategories_1.personCategories.MONITOR_DE_INFORMATICA, personCategories_1.personCategories.SECRETARIO, personCategories_1.personCategories.COORDENADOR, personCategories_1.personCategories.VICE_DIRETOR];
                    if (!canEdit.includes(databaseTeacher === null || databaseTeacher === void 0 ? void 0 : databaseTeacher.person.category.id)) {
                        return { status: 403, message: 'Você não tem permissão para editar uma pessoa dessa categoria. Solicite a alguém com cargo um cargo superior ao seu.' };
                    }
                }
                if (frontendTeacher.person.category.id === personCategories_1.personCategories.SUPERVISOR) {
                    const canEdit = [personCategories_1.personCategories.PROFESSOR, personCategories_1.personCategories.MONITOR_DE_INFORMATICA, personCategories_1.personCategories.SECRETARIO, personCategories_1.personCategories.COORDENADOR, personCategories_1.personCategories.VICE_DIRETOR, personCategories_1.personCategories.DIRETOR];
                    if (!canEdit.includes(databaseTeacher === null || databaseTeacher === void 0 ? void 0 : databaseTeacher.person.category.id)) {
                        return { status: 403, message: 'Você não tem permissão para editar uma pessoa dessa categoria. Solicite a alguém com cargo um cargo superior ao seu.' };
                    }
                }
                if (frontendTeacher.person.category.id === personCategories_1.personCategories.ADMINISTRADOR) {
                    const canEdit = [personCategories_1.personCategories.PROFESSOR, personCategories_1.personCategories.MONITOR_DE_INFORMATICA, personCategories_1.personCategories.SECRETARIO, personCategories_1.personCategories.COORDENADOR, personCategories_1.personCategories.VICE_DIRETOR, personCategories_1.personCategories.DIRETOR, personCategories_1.personCategories.SUPERVISOR, personCategories_1.personCategories.ADMINISTRADOR];
                    if (!canEdit.includes(databaseTeacher === null || databaseTeacher === void 0 ? void 0 : databaseTeacher.person.category.id)) {
                        return { status: 403, message: 'Você não tem permissão para editar uma pessoa dessa categoria. Solicite a alguém com cargo um cargo superior ao seu.' };
                    }
                }
                if (frontendTeacher.person.category.id === personCategories_1.personCategories.PROFESSOR || frontendTeacher.person.category.id === personCategories_1.personCategories.MONITOR_DE_INFORMATICA && frontendTeacher.id !== databaseTeacher.id) {
                    return { status: 401, message: 'Você não tem permissão para editar este registro.' };
                }
                databaseTeacher.person.name = body.name;
                databaseTeacher.person.birth = body.birth;
                if (databaseTeacher.person.category.id === personCategories_1.personCategories.ADMINISTRADOR || databaseTeacher.person.category.id === personCategories_1.personCategories.SUPERVISOR) {
                    yield data_source_1.AppDataSource.getRepository(Teacher_1.Teacher).save(databaseTeacher);
                    return { status: 200, data: databaseTeacher };
                }
                if (body.teacherClasses) {
                    yield this.updateClassRel(databaseTeacher, body);
                }
                if (body.teacherDisciplines) {
                    yield this.updateDisciRel(databaseTeacher, body);
                }
                yield data_source_1.AppDataSource.getRepository(Teacher_1.Teacher).save(databaseTeacher);
                return { status: 200, data: databaseTeacher };
            }
            catch (error) {
                return { status: 500, message: error.message };
            }
        });
    }
    getRequestedStudentTransfers(request) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const teacherClasses = yield this.teacherClassrooms(request === null || request === void 0 ? void 0 : request.body.user);
                const studentClassrooms = yield data_source_1.AppDataSource.getRepository(StudentClassroom_1.StudentClassroom)
                    .createQueryBuilder('studentClassroom')
                    .leftJoin('studentClassroom.classroom', 'classroom')
                    .leftJoin('studentClassroom.student', 'student')
                    .leftJoin('student.person', 'person')
                    .leftJoin('student.transfers', 'transfers')
                    .where('classroom.id IN (:...ids)', { ids: teacherClasses.classrooms })
                    .andWhere('studentClassroom.endedAt IS NULL')
                    .andWhere('transfers.endedAt IS NULL')
                    .andWhere('transfers.status = :status', { status: transferStatus_1.transferStatus.PENDING })
                    .getCount();
                return { status: 200, data: studentClassrooms };
            }
            catch (error) {
                return { status: 500, message: error.message };
            }
        });
    }
    teacherCategory() {
        return __awaiter(this, void 0, void 0, function* () {
            return yield data_source_1.AppDataSource.getRepository(PersonCategory_1.PersonCategory).findOne({ where: { id: personCategories_1.personCategories.PROFESSOR } });
        });
    }
    updateClassRel(teacher, body) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.createRelation(teacher, body, true);
            const teacherClassDisciplines = yield data_source_1.AppDataSource.getRepository(TeacherClassDiscipline_1.TeacherClassDiscipline).find({
                relations: ['classroom', 'teacher'],
                where: { endedAt: (0, typeorm_1.IsNull)(), teacher: { id: Number(teacher.id) } }
            });
            for (let relation of teacherClassDisciplines) {
                if (!body.teacherClasses.includes(relation.classroom.id)) {
                    relation.endedAt = new Date();
                    yield teacherClassDiscipline_1.teacherClassDisciplineController.save(relation, {});
                }
            }
        });
    }
    updateDisciRel(teacher, body) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.createRelation(teacher, body, false);
            const teacherClassDisciplines = yield data_source_1.AppDataSource.getRepository(TeacherClassDiscipline_1.TeacherClassDiscipline).find({
                relations: ['discipline', 'teacher'],
                where: { endedAt: (0, typeorm_1.IsNull)(), teacher: { id: Number(teacher.id) } }
            });
            for (let relation of teacherClassDisciplines) {
                if (!body.teacherDisciplines.includes(relation.discipline.id)) {
                    relation.endedAt = new Date();
                    yield teacherClassDiscipline_1.teacherClassDisciplineController.save(relation, {});
                }
            }
        });
    }
    createRelation(teacher, body, forClassroom) {
        return __awaiter(this, void 0, void 0, function* () {
            const classrooms = yield data_source_1.AppDataSource.getRepository(Classroom_1.Classroom).findBy({ id: (0, typeorm_1.In)(body.teacherClasses) });
            const disciplines = yield data_source_1.AppDataSource.getRepository(Discipline_1.Discipline).findBy({ id: (0, typeorm_1.In)(body.teacherDisciplines) });
            if (forClassroom) {
                for (let classroom of classrooms) {
                    const relationExists = (yield teacherClassDiscipline_1.teacherClassDisciplineController.findOneByWhere({
                        where: { teacher: teacher, classroom: classroom, endedAt: (0, typeorm_1.IsNull)() }
                    })).data;
                    if (!relationExists) {
                        for (let discipline of disciplines) {
                            const newTeacherRelations = new TeacherClassDiscipline_1.TeacherClassDiscipline();
                            newTeacherRelations.teacher = teacher;
                            newTeacherRelations.classroom = classroom;
                            newTeacherRelations.discipline = discipline;
                            newTeacherRelations.startedAt = new Date();
                            yield teacherClassDiscipline_1.teacherClassDisciplineController.save(newTeacherRelations, {});
                        }
                    }
                }
                return;
            }
            for (let discipline of disciplines) {
                const relationExists = (yield teacherClassDiscipline_1.teacherClassDisciplineController.findOneByWhere({
                    where: { teacher: teacher, discipline: discipline, endedAt: (0, typeorm_1.IsNull)() }
                })).data;
                if (!relationExists) {
                    for (let classroom of classrooms) {
                        const newTeacherRelations = new TeacherClassDiscipline_1.TeacherClassDiscipline();
                        newTeacherRelations.teacher = teacher;
                        newTeacherRelations.classroom = classroom;
                        newTeacherRelations.discipline = discipline;
                        newTeacherRelations.startedAt = new Date();
                        yield teacherClassDiscipline_1.teacherClassDisciplineController.save(newTeacherRelations, {});
                    }
                }
            }
        });
    }
    createTeacher(person, body) {
        const teacher = new Teacher_1.Teacher();
        teacher.person = person;
        teacher.email = body.email;
        teacher.register = body.register;
        return teacher;
    }
    // TODO: dando problema de usuário duplicado aqui. exe: Professor
    generateUser(person) {
        const username = person.name.substring(0, 10).replace(/\s/g, '').trim();
        const password = this.generatePassword(8);
        return { username, password };
    }
    generatePassword(length) {
        const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
        let randomString = '';
        for (let i = 0; i < length; i++) {
            const randomIndex = Math.floor(Math.random() * charset.length);
            randomString += charset[randomIndex];
        }
        return randomString;
    }
}
exports.teacherController = new TeacherController();

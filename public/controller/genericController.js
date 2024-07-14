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
exports.GenericController = void 0;
const typeorm_1 = require("typeorm");
const data_source_1 = require("../data-source");
const Person_1 = require("../model/Person");
const Year_1 = require("../model/Year");
const Classroom_1 = require("../model/Classroom");
const State_1 = require("../model/State");
const TransferStatus_1 = require("../model/TransferStatus");
const Teacher_1 = require("../model/Teacher");
class GenericController {
    constructor(entity) {
        this.entity = entity;
    }
    get repository() { return data_source_1.AppDataSource.getRepository(this.entity); }
    findAllWhere(options = {}, request, CONN) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                if (!CONN) {
                    const result = yield this.repository.find();
                    return { status: 200, data: result };
                }
                const result = yield CONN.find(this.entity);
                return { status: 200, data: result };
            }
            catch (error) {
                return { status: 500, message: error.message };
            }
        });
    }
    findOneByWhere(options, CONN) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                if (!CONN) {
                    const result = yield this.repository.findOne(options);
                    if (!result) {
                        return { status: 404, message: "Data not found" };
                    }
                    return { status: 200, data: result };
                }
                const result = yield CONN.findOne(this.entity, options);
                if (!result) {
                    return { status: 404, message: "Data not found" };
                }
                return { status: 200, data: result };
            }
            catch (error) {
                return { status: 500, message: error.message };
            }
        });
    }
    findOneById(id, body, CONN) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                if (!CONN) {
                    const result = yield this.repository.findOneBy({ id: id });
                    if (!result) {
                        return { status: 404, message: "Data not found" };
                    }
                    return { status: 200, data: result };
                }
                const result = yield CONN.findOneBy(this.entity, { id: id });
                if (!result) {
                    return { status: 404, message: "Data not found" };
                }
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
                const result = yield this.repository.save(body, options);
                return { status: 201, data: result };
            }
            catch (error) {
                return { status: 500, message: error.message };
            }
        });
    }
    updateId(id, body) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const dataInDataBase = yield this.repository.findOneBy({ id: id });
                if (!dataInDataBase) {
                    return { status: 404, message: "Data not found" };
                }
                for (const key in body) {
                    dataInDataBase[key] = body[key];
                }
                const result = yield this.repository.save(dataInDataBase);
                return { status: 200, data: result };
            }
            catch (error) {
                return { status: 500, message: error.message };
            }
        });
    }
    deleteId(id) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const dataToDelete = yield this.repository.findOneBy({ id: id });
                if (!dataToDelete) {
                    return { status: 404, message: "Data not found" };
                }
                const result = yield this.repository.delete(dataToDelete);
                return { status: 200, data: result };
            }
            catch (error) {
                return { status: 500, message: error.message };
            }
        });
    }
    createPerson(body) { const el = new Person_1.Person(); el.name = body.name; el.birth = body.birth; el.category = body.category; return el; }
    currentYear(CONN) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!CONN) {
                return (yield data_source_1.AppDataSource.getRepository(Year_1.Year).findOne({ where: { endedAt: (0, typeorm_1.IsNull)(), active: true } }));
            }
            return yield CONN.findOne(Year_1.Year, { where: { endedAt: (0, typeorm_1.IsNull)(), active: true } });
        });
    }
    classroom(id, CONN) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!CONN) {
                return (yield data_source_1.AppDataSource.getRepository(Classroom_1.Classroom).findOne({ where: { id: id } }));
            }
            return yield CONN.findOne(Classroom_1.Classroom, { where: { id: id } });
        });
    }
    state(id, CONN) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!CONN) {
                return (yield data_source_1.AppDataSource.getRepository(State_1.State).findOne({ where: { id: id } }));
            }
            return yield CONN.findOne(State_1.State, { where: { id: id } });
        });
    }
    transferStatus(id, CONN) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!CONN) {
                return (yield data_source_1.AppDataSource.getRepository(TransferStatus_1.TransferStatus).findOne({ where: { id: id } }));
            }
            return yield CONN.findOne(TransferStatus_1.TransferStatus, { where: { id: id } });
        });
    }
    teacherByUser(userId, CONN) {
        return __awaiter(this, void 0, void 0, function* () {
            const options = { relations: ["person.category", "person.user"], where: { person: { user: { id: userId } } } };
            if (!CONN) {
                return (yield data_source_1.AppDataSource.getRepository(Teacher_1.Teacher).findOne(options));
            }
            return yield CONN.findOne(Teacher_1.Teacher, options);
        });
    }
    teacherClassrooms(body, CONN) {
        var _a, _b, _c, _d;
        return __awaiter(this, void 0, void 0, function* () {
            if (!CONN) {
                const result = (yield data_source_1.AppDataSource.createQueryBuilder()
                    .select("teacher.id", "teacher")
                    .addSelect("GROUP_CONCAT(DISTINCT classroom.id ORDER BY classroom.id ASC)", "classrooms")
                    .from(Teacher_1.Teacher, "teacher")
                    .leftJoin("teacher.person", "person")
                    .leftJoin("person.user", "user")
                    .leftJoin("teacher.teacherClassDiscipline", "teacherClassDiscipline")
                    .leftJoin("teacherClassDiscipline.classroom", "classroom")
                    .where("user.id = :userId AND teacherClassDiscipline.endedAt IS NULL", { userId: body.user })
                    .groupBy("teacher.id")
                    .getRawOne());
                return { id: result.teacher, classrooms: (_b = (_a = result.classrooms) === null || _a === void 0 ? void 0 : _a.split(",").map((classroomId) => Number(classroomId))) !== null && _b !== void 0 ? _b : [] };
            }
            const result = (yield CONN.createQueryBuilder()
                .select("teacher.id", "teacher")
                .addSelect("GROUP_CONCAT(DISTINCT classroom.id ORDER BY classroom.id ASC)", "classrooms")
                .from(Teacher_1.Teacher, "teacher")
                .leftJoin("teacher.person", "person")
                .leftJoin("person.user", "user")
                .leftJoin("teacher.teacherClassDiscipline", "teacherClassDiscipline")
                .leftJoin("teacherClassDiscipline.classroom", "classroom")
                .where("user.id = :userId AND teacherClassDiscipline.endedAt IS NULL", { userId: body.user })
                .groupBy("teacher.id")
                .getRawOne());
            return { id: result.teacher, classrooms: (_d = (_c = result.classrooms) === null || _c === void 0 ? void 0 : _c.split(",").map((classroomId) => Number(classroomId))) !== null && _d !== void 0 ? _d : [] };
        });
    }
    teacherDisciplines(body, CONN) {
        var _a, _b, _c, _d;
        return __awaiter(this, void 0, void 0, function* () {
            if (!CONN) {
                const result = (yield data_source_1.AppDataSource.createQueryBuilder()
                    .select("teacher.id", "teacher")
                    .addSelect("GROUP_CONCAT(DISTINCT discipline.id ORDER BY discipline.id ASC)", "disciplines")
                    .from(Teacher_1.Teacher, "teacher")
                    .leftJoin("teacher.person", "person")
                    .leftJoin("person.user", "user")
                    .leftJoin("teacher.teacherClassDiscipline", "teacherClassDiscipline")
                    .leftJoin("teacherClassDiscipline.discipline", "discipline")
                    .where("user.id = :userId AND teacherClassDiscipline.endedAt IS NULL", { userId: body.user })
                    .groupBy("teacher.id")
                    .getRawOne());
                return { id: result.teacher, disciplines: (_b = (_a = result.disciplines) === null || _a === void 0 ? void 0 : _a.split(",").map((disciplineId) => Number(disciplineId))) !== null && _b !== void 0 ? _b : [] };
            }
            const result = (yield CONN.createQueryBuilder()
                .select("teacher.id", "teacher")
                .addSelect("GROUP_CONCAT(DISTINCT discipline.id ORDER BY discipline.id ASC)", "disciplines")
                .from(Teacher_1.Teacher, "teacher")
                .leftJoin("teacher.person", "person")
                .leftJoin("person.user", "user")
                .leftJoin("teacher.teacherClassDiscipline", "teacherClassDiscipline")
                .leftJoin("teacherClassDiscipline.discipline", "discipline")
                .where("user.id = :userId AND teacherClassDiscipline.endedAt IS NULL", { userId: body.user })
                .groupBy("teacher.id")
                .getRawOne());
            return { id: result.teacher, disciplines: (_d = (_c = result.disciplines) === null || _c === void 0 ? void 0 : _c.split(",").map((disciplineId) => Number(disciplineId))) !== null && _d !== void 0 ? _d : [] };
        });
    }
}
exports.GenericController = GenericController;

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
exports.yearController = void 0;
const genericController_1 = require("./genericController");
const typeorm_1 = require("typeorm");
const Year_1 = require("../model/Year");
const Bimester_1 = require("../model/Bimester");
const Period_1 = require("../model/Period");
const data_source_1 = require("../data-source");
const personCategories_1 = require("../utils/personCategories");
const StudentClassroom_1 = require("../model/StudentClassroom");
class YearController extends genericController_1.GenericController {
    constructor() { super(Year_1.Year); }
    findAllWhere(options, request) {
        return __awaiter(this, void 0, void 0, function* () {
            const search = request === null || request === void 0 ? void 0 : request.query.search;
            try {
                return yield data_source_1.AppDataSource.transaction((CONN) => __awaiter(this, void 0, void 0, function* () {
                    const data = yield CONN.find(Year_1.Year, { relations: ['periods.bimester'], order: { name: 'DESC', periods: { bimester: { id: 'ASC' } } }, where: { name: (0, typeorm_1.ILike)(`%${search}%`) } });
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
            try {
                return yield data_source_1.AppDataSource.transaction((CONN) => __awaiter(this, void 0, void 0, function* () {
                    var _a, _b;
                    const uTeacher = yield this.teacherByUser(body.user.user, CONN);
                    const canCreate = [personCategories_1.pc.ADMN];
                    if (!canCreate.includes(uTeacher.person.category.id)) {
                        return { status: 403, message: 'Você não tem permissão para criar um ano letivo. Solicite a um Administrador do sistema.' };
                    }
                    const yearExists = yield this.checkIfExists(body, CONN);
                    if (yearExists && yearExists.name === body.name) {
                        return { status: 404, message: `O ano ${body.name} já existe.` };
                    }
                    const currentYear = yield this.currentYear(CONN);
                    if (currentYear && currentYear.active && body.active) {
                        return { status: 404, message: `O ano ${currentYear.name} está ativo. Encerre-o antes de criar um novo.` };
                    }
                    const baseYear = yield CONN.getRepository(Year_1.Year)
                        .createQueryBuilder('year')
                        .select('MAX(CAST(year.name AS UNSIGNED))', 'maxValue')
                        .getRawOne();
                    const toNewYear = Number(baseYear.maxValue) + 1;
                    const newYear = new Year_1.Year();
                    newYear.name = toNewYear.toString();
                    newYear.active = true;
                    newYear.createdAt = (_a = body.createdAt) !== null && _a !== void 0 ? _a : new Date();
                    newYear.endedAt = (_b = body.endedAt) !== null && _b !== void 0 ? _b : null;
                    const registers = yield CONN.find(Bimester_1.Bimester);
                    for (let el of registers) {
                        yield CONN.save(Period_1.Period, { year: newYear, bimester: el });
                    }
                    return { status: 201, data: newYear };
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
                    const { data } = yield this.findOneById(id, {}, CONN);
                    const yearToUpdate = data;
                    if (!yearToUpdate) {
                        return { status: 404, message: 'Data not found' };
                    }
                    const yearExists = yield this.checkIfExists(body, CONN);
                    if (yearExists && yearExists.name === body.name && yearExists.id !== yearToUpdate.id) {
                        return { status: 400, message: `O ano ${body.name} já existe.` };
                    }
                    const currentYear = yield this.currentYear(CONN);
                    if (currentYear && currentYear.active && body.active) {
                        return { status: 400, message: `O ano ${currentYear.name} está ativo.` };
                    }
                    for (const prop in body) {
                        yearToUpdate[prop] = body[prop];
                    }
                    if (!body.active && body.endedAt === '' || body.endedAt === null) {
                        return { status: 400, message: 'Data de encerramento não pode ser vazia.' };
                    }
                    if (!body.active && body.endedAt) {
                        const allStudentsClassroomsYear = yield CONN.getRepository(StudentClassroom_1.StudentClassroom)
                            .createQueryBuilder('studentClassroom')
                            .leftJoin('studentClassroom.year', 'year')
                            .where('year.id = :yearId', { yearId: data.id })
                            .andWhere('studentClassroom.endedAt IS NULL')
                            .getMany();
                        for (let register of allStudentsClassroomsYear) {
                            yield CONN.getRepository(StudentClassroom_1.StudentClassroom).save(Object.assign(Object.assign({}, register), { endedAt: new Date() }));
                        }
                    }
                    const result = yield CONN.save(Year_1.Year, yearToUpdate);
                    return { status: 200, data: result };
                }));
            }
            catch (error) {
                return { status: 500, message: error.message };
            }
        });
    }
    currentYear(CONN) {
        return __awaiter(this, void 0, void 0, function* () { return (yield this.findOneByWhere({ where: { active: true, endedAt: (0, typeorm_1.IsNull)() } }, CONN)).data; });
    }
    checkIfExists(body, CONN) {
        return __awaiter(this, void 0, void 0, function* () { return (yield this.findOneByWhere({ where: { name: body.name } }, CONN)).data; });
    }
}
exports.yearController = new YearController();

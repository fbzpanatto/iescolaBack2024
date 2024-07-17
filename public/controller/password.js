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
exports.passwordController = void 0;
const Teacher_1 = require("../model/Teacher");
const data_source_1 = require("../data-source");
const email_service_1 = require("../utils/email.service");
class PasswordController {
    constructor() { }
    resetPassword(req) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                return yield data_source_1.AppDataSource.transaction((CONN) => __awaiter(this, void 0, void 0, function* () {
                    const teacher = yield this.teacherByUser(req.body.email, CONN);
                    if (!teacher) {
                        return { status: 404, message: "Não foi possível encontrar o usuário informado." };
                    }
                    yield (0, email_service_1.credentialsEmail)(req.body.email, teacher.person.user.password, false).catch((e) => console.log(e));
                    return { status: 200, data: { message: "Email enviado com sucesso. Confira sua caixa de entrada." } };
                }));
            }
            catch (error) {
                return { status: 500, message: error.message };
            }
        });
    }
    teacherByUser(email, CONN) {
        return __awaiter(this, void 0, void 0, function* () {
            const options = { relations: ["person.category", "person.user"], where: { person: { user: { email } } } };
            return (yield CONN.findOne(Teacher_1.Teacher, Object.assign({}, options)));
        });
    }
}
exports.passwordController = new PasswordController();

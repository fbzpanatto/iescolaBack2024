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
const data_source_1 = require("../data-source");
const email_service_1 = require("../utils/email.service");
const jsonwebtoken_1 = require("jsonwebtoken");
const User_1 = require("../model/User");
class PasswordController {
    constructor() { }
    resetPassword(req) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                return yield data_source_1.AppDataSource.transaction((CONN) => __awaiter(this, void 0, void 0, function* () {
                    const uTeacher = yield CONN.findOne(User_1.User, { relations: ["person.category"], where: { email: req.body.email } });
                    if (!uTeacher) {
                        return { status: 404, message: "Não foi possível encontrar o usuário informado." };
                    }
                    const token = this.resetToken({ id: uTeacher.id, email: uTeacher.email, category: uTeacher.person.category.id });
                    uTeacher.password = token;
                    yield (0, email_service_1.resetPassword)(uTeacher.email, token);
                    yield CONN.save(User_1.User, uTeacher);
                    return { status: 200, data: { message: "Um link para redefinir sua senha foi enviado para o email informado. Confira sua caixa de entrada." } };
                }));
            }
            catch (error) {
                return { status: 500, message: error.message };
            }
        });
    }
    resetToken(payload) {
        return (0, jsonwebtoken_1.sign)(payload, "SECRET", { expiresIn: 900 });
    }
}
exports.passwordController = new PasswordController();

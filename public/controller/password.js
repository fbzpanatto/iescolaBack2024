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
const transporter_1 = require("../utils/transporter");
const Teacher_1 = require("../model/Teacher");
const data_source_1 = require("../data-source");
class PasswordController {
    constructor() { }
    transporterCallBack(err, data) {
        if (err) {
            console.log("Error " + err);
        }
        else {
            console.log("Email sent successfully");
        }
    }
    teacherByUser(username) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield data_source_1.AppDataSource.getRepository(Teacher_1.Teacher).findOne({
                relations: ['person.category', 'person.user'],
                where: { person: { user: { username: username } } },
            });
        });
    }
    resetPassword(request) {
        return __awaiter(this, void 0, void 0, function* () {
            const { body } = request;
            try {
                const teacher = yield this.teacherByUser(body.username);
                if (!teacher) {
                    return { status: 404, message: 'Não foi possível encontrar o usuário informado.' };
                }
                transporter_1.Transporter.sendMail({
                    from: "appescola7@gmail.com",
                    to: teacher.email,
                    subject: 'Redefinição de senha.',
                    text: `Sua senha é: ${teacher.person.user.password}`
                }, this.transporterCallBack);
                return { status: 200, data: { message: "Email enviado com sucesso. Confira sua caixa de entrada." } };
            }
            catch (error) {
                return { status: 500, message: error.message };
            }
        });
    }
}
exports.passwordController = new PasswordController();

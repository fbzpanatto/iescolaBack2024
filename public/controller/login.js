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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.loginCtrl = void 0;
const genericController_1 = require("./genericController");
const User_1 = require("../model/User");
const data_source_1 = require("../data-source");
const jsonwebtoken_1 = require("jsonwebtoken");
const bcrypt_1 = __importDefault(require("bcrypt"));
const generatePassword_1 = require("../utils/generatePassword");
class LoginController extends genericController_1.GenericController {
    constructor() { super(User_1.User); }
    login(req) {
        return __awaiter(this, void 0, void 0, function* () {
            const { email, password: frontPass } = req.body;
            try {
                return yield data_source_1.AppDataSource.transaction((CONN) => __awaiter(this, void 0, void 0, function* () {
                    const user = yield CONN.findOne(User_1.User, { relations: ["person.category"], where: { email } });
                    if (!user) {
                        return { status: 404, message: "Credenciais Inválidas" };
                    }
                    const condition = bcrypt_1.default.compareSync(frontPass, user.password);
                    if (!user || !condition) {
                        return { status: 401, message: "Credenciais Inválidas" };
                    }
                    const payload = { user: user.id, email: user.email, category: user.person.category.id };
                    const token = (0, jsonwebtoken_1.sign)(payload, "SECRET", { expiresIn: 10800 });
                    const decoded = (0, jsonwebtoken_1.verify)(token, "SECRET");
                    const expiresIn = decoded.exp;
                    const role = decoded.category;
                    return { status: 200, data: { token, expiresIn, role, person: user.person.name } };
                }));
            }
            catch (error) {
                return { status: 500, message: error.message };
            }
        });
    }
    renewPassword(req) {
        return __awaiter(this, void 0, void 0, function* () {
            const { token: frontToken, password: newPassword } = req.body;
            try {
                return yield data_source_1.AppDataSource.transaction((CONN) => __awaiter(this, void 0, void 0, function* () {
                    const frontDecoded = (0, jsonwebtoken_1.verify)(frontToken, "SECRET");
                    if (!(frontDecoded.iat && frontDecoded.exp && frontDecoded.email)) {
                        return { status: 401, message: 'Pedido expirado, faça uma nova solicitação para redefinir sua senha.' };
                    }
                    const user = yield CONN.findOne(User_1.User, { relations: ["person.category"], where: { email: frontDecoded.email } });
                    if (!user) {
                        return { status: 404, message: "Usuário não encontrado" };
                    }
                    user.password = (0, generatePassword_1.generatePassword)(newPassword).hashedPassword;
                    yield CONN.save(User_1.User, user);
                    const payload = { user: user.id, email: user.email, category: user.person.category.id };
                    const backendToken = (0, jsonwebtoken_1.sign)(payload, "SECRET", { expiresIn: 10800 });
                    const decoded = (0, jsonwebtoken_1.verify)(backendToken, "SECRET");
                    const expiresIn = decoded.exp;
                    const role = decoded.category;
                    return { status: 200, data: { token: backendToken, expiresIn, role, person: user.person.name } };
                }));
            }
            catch (error) {
                return { status: 500, message: error.message };
            }
        });
    }
}
exports.loginCtrl = new LoginController();

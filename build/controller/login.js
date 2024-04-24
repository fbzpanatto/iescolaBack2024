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
exports.loginController = void 0;
const genericController_1 = require("./genericController");
const User_1 = require("../model/User");
const data_source_1 = require("../data-source");
const jwt = require('jsonwebtoken');
class LoginController extends genericController_1.GenericController {
    constructor() {
        super(User_1.User);
    }
    login(req) {
        return __awaiter(this, void 0, void 0, function* () {
            const { username, password } = req.body;
            try {
                const user = yield data_source_1.AppDataSource.getRepository(User_1.User).findOne({
                    relations: ['person.category'],
                    where: { username: username }
                });
                if (!user || password !== user.password) {
                    return { status: 401, message: 'Credenciais Inválidas' };
                }
                const payload = {
                    user: user.id,
                    username: user.username,
                    category: user.person.category.id,
                };
                const token = jwt.sign(payload, 'SECRET', { expiresIn: 10800 });
                return { status: 200, data: { token: token, expiresIn: jwt.decode(token).exp, role: jwt.decode(token).category, person: user.person.name } };
            }
            catch (error) {
                return { status: 500, message: error.message };
            }
        });
    }
}
exports.loginController = new LoginController();

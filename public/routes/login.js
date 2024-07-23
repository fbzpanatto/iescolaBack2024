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
exports.LoginRouter = void 0;
const express_1 = require("express");
const login_1 = require("../controller/login");
exports.LoginRouter = (0, express_1.Router)();
exports.LoginRouter.post('/', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const response = yield login_1.loginCtrl.login(req);
    return res.status(response.status).json(response);
}));
exports.LoginRouter.post('/renew-password', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const response = yield login_1.loginCtrl.renewPassword(req);
    return res.status(response.status).json(response);
}));

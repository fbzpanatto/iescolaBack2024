"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PasswordRouter = void 0;
const express_1 = require("express");
const password_1 = require("../controller/password");
exports.PasswordRouter = (0, express_1.Router)();
exports.PasswordRouter.post('/', (req, res) => {
    password_1.passwordController.resetPassword(req)
        .then(r => res.status(r.status).json(r))
        .catch(e => res.status(e.status).json(e));
});

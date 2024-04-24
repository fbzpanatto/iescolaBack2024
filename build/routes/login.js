"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LoginRouter = void 0;
const express_1 = require("express");
const login_1 = require("../controller/login");
exports.LoginRouter = (0, express_1.Router)();
exports.LoginRouter.post('/', (req, res) => {
    login_1.loginController.login(req)
        .then(r => res.status(r.status).json(r))
        .catch(e => res.status(e.status).json(e));
});

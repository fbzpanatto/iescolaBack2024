"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserRouter = void 0;
const express_1 = require("express");
const user_1 = require("../controller/user");
exports.UserRouter = (0, express_1.Router)();
exports.UserRouter.post('/', (req, res) => {
    user_1.userController.save(req.body)
        .then(r => res.status(r.status).json(r))
        .catch(e => res.status(e.status).json(e));
});

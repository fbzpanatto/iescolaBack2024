"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LiteracySecondRouter = void 0;
const express_1 = require("express");
const literacySecond_1 = require("../controller/literacySecond");
const havePermission_1 = __importDefault(require("../middleware/havePermission"));
exports.LiteracySecondRouter = (0, express_1.Router)();
exports.LiteracySecondRouter.get('/:year', havePermission_1.default, (req, res) => {
    literacySecond_1.literacySecondController.getClassrooms(req)
        .then(r => res.status(r.status).json(r))
        .catch(e => res.status(e.status).json(e));
});

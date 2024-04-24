"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TextGenderGradeReportRouter = void 0;
const express_1 = require("express");
const textGenderGradeReport_1 = require("../controller/textGenderGradeReport");
const havePermission_1 = __importDefault(require("../middleware/havePermission"));
exports.TextGenderGradeReportRouter = (0, express_1.Router)();
exports.TextGenderGradeReportRouter.get('/report/:classroom/:year/:textgender', havePermission_1.default, (req, res) => {
    textGenderGradeReport_1.textGenderGradeReportController.getReport(req)
        .then(r => res.status(r.status).json(r))
        .catch(e => res.status(e.status).json(e));
});

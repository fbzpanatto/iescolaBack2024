"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TextGenderGradeRouter = void 0;
const express_1 = require("express");
const textGenderGrade_1 = require("../controller/textGenderGrade");
const havePermission_1 = __importDefault(require("../middleware/havePermission"));
exports.TextGenderGradeRouter = (0, express_1.Router)();
exports.TextGenderGradeRouter.get('/:classroom/:year/:gender', havePermission_1.default, (req, res) => {
    textGenderGrade_1.textGenderGradeController.getAll(req)
        .then(r => res.status(r.status).json(r))
        .catch(e => res.status(e.status).json(e));
});
exports.TextGenderGradeRouter.get('/:classroom/:year', havePermission_1.default, (req, res) => {
    textGenderGrade_1.textGenderGradeController.getTotals(req)
        .then(r => res.status(r.status).json(r))
        .catch(e => res.status(e.status).json(e));
});
exports.TextGenderGradeRouter.put('/many', havePermission_1.default, (req, res) => {
    textGenderGrade_1.textGenderGradeController.updateMany(req.body)
        .then(r => res.status(r.status).json(r))
        .catch(e => res.status(e.status).json(e));
});
exports.TextGenderGradeRouter.put('/:studentClassroomId', havePermission_1.default, (req, res) => {
    textGenderGrade_1.textGenderGradeController.updateStudentTextGenderExamGrade(req.body)
        .then(r => res.status(r.status).json(r))
        .catch(e => res.status(e.status).json(e));
});

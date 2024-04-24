"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.StudentQuestionRouter = void 0;
const express_1 = require("express");
const StudentQuestion_1 = require("../controller/StudentQuestion");
const havePermission_1 = __importDefault(require("../middleware/havePermission"));
exports.StudentQuestionRouter = (0, express_1.Router)();
exports.StudentQuestionRouter.put('/:id/question', havePermission_1.default, (req, res) => {
    StudentQuestion_1.studentQuestionController.updateQuestion(req.params.id, req.body)
        .then(r => res.status(r.status).json(r))
        .catch(e => res.status(e.status).json(e));
});
exports.StudentQuestionRouter.put('/:id/test-status', havePermission_1.default, (req, res) => {
    StudentQuestion_1.studentQuestionController.updateTestStatus(req.params.id, req.body)
        .then(r => res.status(r.status).json(r))
        .catch(e => res.status(e.status).json(e));
});

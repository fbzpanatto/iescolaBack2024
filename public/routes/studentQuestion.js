"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.StudentQuestionRouter = void 0;
const express_1 = require("express");
const StudentQuestion_1 = require("../controller/StudentQuestion");
const validators_1 = require("../middleware/validators");
const havePermission_1 = __importDefault(require("../middleware/havePermission"));
const UPDATE_VALIDATORS_ANSWER = [validators_1.PARAM_ID, validators_1.VALIDATE_STUDENT_QUESTIONANSWER, validators_1.BODY_VALIDATION_STUDENT_ANSWER];
const UPDATE_VALIDATORS_STATUS = [validators_1.PARAM_ID, validators_1.VALIDATE_STUDENT_QUESTIONSTATUS, validators_1.BODY_VALIDATION_STUDENT_QUESTION];
exports.StudentQuestionRouter = (0, express_1.Router)();
exports.StudentQuestionRouter.put('/:id/question', ...UPDATE_VALIDATORS_ANSWER, havePermission_1.default, (req, res) => {
    StudentQuestion_1.studentQuestionController.updateQuestion(req.params.id, req.body)
        .then(r => res.status(r.status).json(r))
        .catch(e => res.status(e.status).json(e));
});
exports.StudentQuestionRouter.put('/:id/test-status', ...UPDATE_VALIDATORS_STATUS, havePermission_1.default, (req, res) => {
    StudentQuestion_1.studentQuestionController.updateTestStatus(req.params.id, req.body)
        .then(r => res.status(r.status).json(r))
        .catch(e => res.status(e.status).json(e));
});

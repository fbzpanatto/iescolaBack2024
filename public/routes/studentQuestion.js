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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.StudentQuestionRouter = void 0;
const express_1 = require("express");
const StudentQuestion_1 = require("../controller/StudentQuestion");
const validators_1 = require("../middleware/validators");
const havePermission_1 = __importDefault(require("../middleware/havePermission"));
const UPDATE_VALIDATORS_ANSWER = [validators_1.ID_PARAM, validators_1.VALIDATE_STUDENT_QUESTIONANSWER, validators_1.BODY_VALIDATION_STUDENT_ANSWER];
const UPDATE_VALIDATORS_STATUS = [validators_1.ID_PARAM, validators_1.VALIDATE_STUDENT_QUESTIONSTATUS, validators_1.BODY_VALIDATION_STUDENT_QUESTION];
exports.StudentQuestionRouter = (0, express_1.Router)();
exports.StudentQuestionRouter.put('/:id/question', validators_1.YEAR_NAME_PARAM, ...UPDATE_VALIDATORS_ANSWER, havePermission_1.default, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const response = yield StudentQuestion_1.stuQuestCtrl.updateQuestion(req, req.body);
    return res.status(response.status).json(response);
}));
exports.StudentQuestionRouter.put('/:id/test-status', ...UPDATE_VALIDATORS_STATUS, havePermission_1.default, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const response = yield StudentQuestion_1.stuQuestCtrl.updateTestStatus(req.params.id, req.body);
    return res.status(response.status).json(response);
}));

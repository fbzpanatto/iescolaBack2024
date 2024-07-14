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
exports.TextGenderGradeRouter = void 0;
const express_1 = require("express");
const textGenderGrade_1 = require("../controller/textGenderGrade");
const validators_1 = require("../middleware/validators");
const havePermission_1 = __importDefault(require("../middleware/havePermission"));
exports.TextGenderGradeRouter = (0, express_1.Router)();
exports.TextGenderGradeRouter.get('/:classroom/:year/:gender', [validators_1.CLASSROOM_ID_PARAM, validators_1.YEAR_NAME_PARAM], havePermission_1.default, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const response = yield textGenderGrade_1.textGenderGradeController.getAll(req);
    return res.status(response.status).json(response);
}));
exports.TextGenderGradeRouter.get('/:classroom/:year', [validators_1.CLASSROOM_ID_PARAM, validators_1.YEAR_NAME_PARAM], havePermission_1.default, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const response = yield textGenderGrade_1.textGenderGradeController.getTotals(req);
    return res.status(response.status).json(response);
}));
exports.TextGenderGradeRouter.put('/many', havePermission_1.default, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const response = yield textGenderGrade_1.textGenderGradeController.updateMany(req.body);
    return res.status(response.status).json(response);
}));
exports.TextGenderGradeRouter.put('/:studentClassroomId', validators_1.STUDENT_CLASSROOM_ID, havePermission_1.default, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const response = yield textGenderGrade_1.textGenderGradeController.updateExamGrade(req.body);
    return res.status(response.status).json(response);
}));

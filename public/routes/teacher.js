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
exports.TeacherRouter = void 0;
const express_1 = require("express");
const teacher_1 = require("../controller/teacher");
const validators_1 = require("../middleware/validators");
const havePermission_1 = __importDefault(require("../middleware/havePermission"));
const CREATE_VALIDATORS = [validators_1.VALIDATE_TEACHER, validators_1.BODY_VALIDATION_TEACHER];
const UPDATE_VALIDATORS = [validators_1.VALIDATE_ID, validators_1.VALIDATE_TEACHER, validators_1.BODY_VALIDATION_TEACHER];
exports.TeacherRouter = (0, express_1.Router)();
exports.TeacherRouter.get('/pending-transfer', havePermission_1.default, (req, res) => {
    teacher_1.teacherController.getRequestedStudentTransfers(req)
        .then(r => res.status(r.status).json(r))
        .catch(e => res.status(e.status).json(e));
});
exports.TeacherRouter.get('/form', havePermission_1.default, (req, res) => {
    teacher_1.teacherController.teacherForm(req)
        .then(r => res.status(r.status).json(r))
        .catch(e => res.status(e.status).json(e));
});
exports.TeacherRouter.get('/', havePermission_1.default, (req, res) => {
    teacher_1.teacherController.findAllWhere({}, req)
        .then(r => res.status(r.status).json(r))
        .catch(e => res.status(e.status).json(e));
});
exports.TeacherRouter.get('/:id', validators_1.VALIDATE_ID, havePermission_1.default, (req, res) => {
    teacher_1.teacherController.findOneById(req.params.id, req)
        .then(r => res.status(r.status).json(r))
        .catch(e => res.status(e.status).json(e));
});
exports.TeacherRouter.post('/', ...CREATE_VALIDATORS, havePermission_1.default, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const response = yield teacher_1.teacherController.saveTeacher(req.body);
    return res.status(response.status).json(response);
}));
exports.TeacherRouter.put('/:id', ...UPDATE_VALIDATORS, havePermission_1.default, (req, res) => {
    teacher_1.teacherController.updateId(req.params.id, req.body)
        .then(r => res.status(r.status).json(r))
        .catch(e => res.status(e.status).json(e));
});
exports.TeacherRouter.delete('/:id', validators_1.VALIDATE_ID, havePermission_1.default, (req, res) => {
    teacher_1.teacherController.deleteId(req.params.id)
        .then(r => res.status(r.status).json(r))
        .catch(e => res.status(e.status).json(e));
});

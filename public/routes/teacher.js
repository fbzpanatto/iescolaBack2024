"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TeacherRouter = void 0;
const express_1 = require("express");
const teacher_1 = require("../controller/teacher");
const havePermission_1 = __importDefault(require("../middleware/havePermission"));
exports.TeacherRouter = (0, express_1.Router)();
exports.TeacherRouter.get('/pending-transfer', havePermission_1.default, (req, res) => {
    teacher_1.teacherController.getRequestedStudentTransfers(req)
        .then(r => res.status(r.status).json(r))
        .catch(e => res.status(e.status).json(e));
});
exports.TeacherRouter.get('/', havePermission_1.default, (req, res) => {
    teacher_1.teacherController.findAllWhere({}, req)
        .then(r => res.status(r.status).json(r))
        .catch(e => res.status(e.status).json(e));
});
exports.TeacherRouter.get('/:id', havePermission_1.default, (req, res) => {
    teacher_1.teacherController.findOneById(req.params.id, req)
        .then(r => res.status(r.status).json(r))
        .catch(e => res.status(e.status).json(e));
});
exports.TeacherRouter.post('/', havePermission_1.default, (req, res) => {
    teacher_1.teacherController.save(req.body, {})
        .then(r => res.status(r.status).json(r))
        .catch(e => res.status(e.status).json(e));
});
exports.TeacherRouter.put('/:id', havePermission_1.default, (req, res) => {
    teacher_1.teacherController.updateId(req.params.id, req.body)
        .then(r => res.status(r.status).json(r))
        .catch(e => res.status(e.status).json(e));
});
exports.TeacherRouter.delete('/:id', havePermission_1.default, (req, res) => {
    teacher_1.teacherController.deleteId(req.params.id)
        .then(r => res.status(r.status).json(r))
        .catch(e => res.status(e.status).json(e));
});

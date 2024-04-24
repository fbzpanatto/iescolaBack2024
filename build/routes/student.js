"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.StudentRouter = void 0;
const express_1 = require("express");
const student_1 = require("../controller/student");
const havePermission_1 = __importDefault(require("../middleware/havePermission"));
exports.StudentRouter = (0, express_1.Router)();
exports.StudentRouter.get('/inactive/:year', havePermission_1.default, (req, res) => {
    student_1.studentController.getAllInactivates(req)
        .then(r => res.status(r.status).json(r))
        .catch(e => res.status(e.status).json(e));
});
exports.StudentRouter.post('/inactive', havePermission_1.default, (req, res) => {
    student_1.studentController.setInactiveNewClassroom(req.body)
        .then(r => res.status(r.status).json(r))
        .catch(e => res.status(e.status).json(e));
});
exports.StudentRouter.get('/:year/all', havePermission_1.default, (req, res) => {
    student_1.studentController.findAllWhere({}, req)
        .then(r => res.status(r.status).json(r))
        .catch(e => res.status(e.status).json(e));
});
exports.StudentRouter.get('/:id', havePermission_1.default, (req, res) => {
    student_1.studentController.findOneById(req.params.id, req.body)
        .then(r => res.status(r.status).json(r))
        .catch(e => res.status(e.status).json(e));
});
exports.StudentRouter.post('/', havePermission_1.default, (req, res) => {
    student_1.studentController.save(req.body)
        .then(r => res.status(r.status).json(r))
        .catch(e => res.status(e.status).json(e));
});
exports.StudentRouter.put('/literacy-first/:id', havePermission_1.default, (req, res) => {
    student_1.studentController.putLiteracyBeforeLevel(req.body)
        .then(r => res.status(r.status).json(r))
        .catch(e => res.status(e.status).json(e));
});
exports.StudentRouter.put('/:id/graduate', havePermission_1.default, (req, res) => {
    student_1.studentController.graduate(req.params.id, req.body)
        .then(r => res.status(r.status).json(r))
        .catch(e => res.status(e.status).json(e));
});
exports.StudentRouter.put('/:id', havePermission_1.default, (req, res) => {
    student_1.studentController.updateId(req.params.id, req.body)
        .then(r => res.status(r.status).json(r))
        .catch(e => res.status(e.status).json(e));
});
exports.StudentRouter.delete('/:id', havePermission_1.default, (req, res) => {
    student_1.studentController.deleteId(req.params.id)
        .then(r => res.status(r.status).json(r))
        .catch(e => res.status(e.status).json(e));
});

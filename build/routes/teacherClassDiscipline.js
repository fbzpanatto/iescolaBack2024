"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TeacherClassDisciplineRouter = void 0;
const express_1 = require("express");
const teacherClassDiscipline_1 = require("../controller/teacherClassDiscipline");
exports.TeacherClassDisciplineRouter = (0, express_1.Router)();
exports.TeacherClassDisciplineRouter.get('/', (req, res) => {
    teacherClassDiscipline_1.teacherClassDisciplineController.findAllWhere({})
        .then(r => res.status(r.status).json(r))
        .catch(e => res.status(e.status).json(e));
});
exports.TeacherClassDisciplineRouter.get('/:id', (req, res) => {
    teacherClassDiscipline_1.teacherClassDisciplineController.findOneById(req.params.id, req)
        .then(r => res.status(r.status).json(r))
        .catch(e => res.status(e.status).json(e));
});
exports.TeacherClassDisciplineRouter.post('/', (req, res) => {
    teacherClassDiscipline_1.teacherClassDisciplineController.save(req.body, {})
        .then(r => res.status(r.status).json(r))
        .catch(e => res.status(e.status).json(e));
});
exports.TeacherClassDisciplineRouter.put('/:id', (req, res) => {
    teacherClassDiscipline_1.teacherClassDisciplineController.updateId(req.params.id, req.body)
        .then(r => res.status(r.status).json(r))
        .catch(e => res.status(e.status).json(e));
});
exports.TeacherClassDisciplineRouter.delete('/:id', (req, res) => {
    teacherClassDiscipline_1.teacherClassDisciplineController.deleteId(req.params.id)
        .then(r => res.status(r.status).json(r))
        .catch(e => res.status(e.status).json(e));
});

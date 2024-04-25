"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ClassroomRouter = void 0;
const express_1 = require("express");
const classroom_1 = require("../controller/classroom");
exports.ClassroomRouter = (0, express_1.Router)();
exports.ClassroomRouter.get('/', (req, res) => {
    classroom_1.classroomController.findAllWhere({}, req)
        .then(r => res.status(r.status).json(r))
        .catch(e => res.status(e.status).json(e));
});
exports.ClassroomRouter.get('/:id', (req, res) => {
    classroom_1.classroomController.findOneById(req.params.id, req)
        .then(r => res.status(r.status).json(r))
        .catch(e => res.status(e.status).json(e));
});
exports.ClassroomRouter.post('/', (req, res) => {
    classroom_1.classroomController.save(req.body, {})
        .then(r => res.status(r.status).json(r))
        .catch(e => res.status(e.status).json(e));
});
exports.ClassroomRouter.put('/:id', (req, res) => {
    classroom_1.classroomController.updateId(req.params.id, req.body)
        .then(r => res.status(r.status).json(r))
        .catch(e => res.status(e.status).json(e));
});
exports.ClassroomRouter.delete('/:id', (req, res) => {
    classroom_1.classroomController.deleteId(req.params.id)
        .then(r => res.status(r.status).json(r))
        .catch(e => res.status(e.status).json(e));
});

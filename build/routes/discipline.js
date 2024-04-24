"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DisciplineRouter = void 0;
const express_1 = require("express");
const discipline_1 = require("../controller/discipline");
exports.DisciplineRouter = (0, express_1.Router)();
exports.DisciplineRouter.get('/', (req, res) => {
    discipline_1.disciplineController.findAllWhere({}, req)
        .then(r => res.status(r.status).json(r))
        .catch(e => res.status(e.status).json(e));
});
exports.DisciplineRouter.get('/:id', (req, res) => {
    discipline_1.disciplineController.findOneById(req.params.id, req)
        .then(r => res.status(r.status).json(r))
        .catch(e => res.status(e.status).json(e));
});
exports.DisciplineRouter.post('/', (req, res) => {
    discipline_1.disciplineController.save(req.body, {})
        .then(r => res.status(r.status).json(r))
        .catch(e => res.status(e.status).json(e));
});
exports.DisciplineRouter.put('/:id', (req, res) => {
    discipline_1.disciplineController.updateId(req.params.id, req.body)
        .then(r => res.status(r.status).json(r))
        .catch(e => res.status(e.status).json(e));
});
exports.DisciplineRouter.delete('/:id', (req, res) => {
    discipline_1.disciplineController.deleteId(req.params.id)
        .then(r => res.status(r.status).json(r))
        .catch(e => res.status(e.status).json(e));
});

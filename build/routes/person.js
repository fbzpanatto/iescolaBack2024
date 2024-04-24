"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PersonRouter = void 0;
const express_1 = require("express");
const person_1 = require("../controller/person");
exports.PersonRouter = (0, express_1.Router)();
exports.PersonRouter.get('/', (req, res) => {
    person_1.personController.findAllWhere({})
        .then(r => res.status(r.status).json(r))
        .catch(e => res.status(e.status).json(e));
});
exports.PersonRouter.get('/:id', (req, res) => {
    person_1.personController.findOneById(req.params.id, req)
        .then(r => res.status(r.status).json(r))
        .catch(e => res.status(e.status).json(e));
});
exports.PersonRouter.post('/', (req, res) => {
    person_1.personController.save(req.body, {})
        .then(r => res.status(r.status).json(r))
        .catch(e => res.status(e.status).json(e));
});
exports.PersonRouter.put('/:id', (req, res) => {
    person_1.personController.updateId(req.params.id, req.body)
        .then(r => res.status(r.status).json(r))
        .catch(e => res.status(e.status).json(e));
});
exports.PersonRouter.delete('/:id', (req, res) => {
    person_1.personController.deleteId(req.params.id)
        .then(r => res.status(r.status).json(r))
        .catch(e => res.status(e.status).json(e));
});

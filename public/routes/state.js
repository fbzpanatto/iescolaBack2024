"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StateRouter = void 0;
const express_1 = require("express");
const state_1 = require("../controller/state");
exports.StateRouter = (0, express_1.Router)();
exports.StateRouter.get('/', (req, res) => {
    state_1.stateController.findAllWhere({})
        .then(r => res.status(r.status).json(r))
        .catch(e => res.status(e.status).json(e));
});
exports.StateRouter.get('/:id', (req, res) => {
    state_1.stateController.findOneById(req.params.id, req)
        .then(r => res.status(r.status).json(r))
        .catch(e => res.status(e.status).json(e));
});
exports.StateRouter.post('/', (req, res) => {
    state_1.stateController.save(req.body, {})
        .then(r => res.status(r.status).json(r))
        .catch(e => res.status(e.status).json(e));
});
exports.StateRouter.put('/:id', (req, res) => {
    state_1.stateController.updateId(req.params.id, req.body)
        .then(r => res.status(r.status).json(r))
        .catch(e => res.status(e.status).json(e));
});
exports.StateRouter.delete('/:id', (req, res) => {
    state_1.stateController.deleteId(req.params.id)
        .then(r => res.status(r.status).json(r))
        .catch(e => res.status(e.status).json(e));
});

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BimesterRouter = void 0;
const express_1 = require("express");
const bimester_1 = require("../controller/bimester");
exports.BimesterRouter = (0, express_1.Router)();
exports.BimesterRouter.get('/', (req, res) => {
    bimester_1.bimesterController.findAllWhere({})
        .then(r => res.status(r.status).json(r))
        .catch(e => res.status(e.status).json(e));
});
exports.BimesterRouter.get('/:id', (req, res) => {
    bimester_1.bimesterController.findOneById(req.params.id, req)
        .then(r => res.status(r.status).json(r))
        .catch(e => res.status(e.status).json(e));
});
exports.BimesterRouter.post('/', (req, res) => {
    bimester_1.bimesterController.save(req.body, {})
        .then(r => res.status(r.status).json(r))
        .catch(e => res.status(e.status).json(e));
});
exports.BimesterRouter.put('/:id', (req, res) => {
    bimester_1.bimesterController.updateId(req.params.id, req.body)
        .then(r => res.status(r.status).json(r))
        .catch(e => res.status(e.status).json(e));
});
exports.BimesterRouter.delete('/:id', (req, res) => {
    bimester_1.bimesterController.deleteId(req.params.id)
        .then(r => res.status(r.status).json(r))
        .catch(e => res.status(e.status).json(e));
});

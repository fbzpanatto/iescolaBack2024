"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DisabilityRouter = void 0;
const express_1 = require("express");
const disability_1 = require("../controller/disability");
exports.DisabilityRouter = (0, express_1.Router)();
exports.DisabilityRouter.get('/', (req, res) => {
    disability_1.disabilityController.findAllWhere({})
        .then(r => res.status(r.status).json(r))
        .catch(e => res.status(e.status).json(e));
});
exports.DisabilityRouter.get('/:id', (req, res) => {
    disability_1.disabilityController.findOneById(req.params.id, req)
        .then(r => res.status(r.status).json(r))
        .catch(e => res.status(e.status).json(e));
});
exports.DisabilityRouter.post('/', (req, res) => {
    disability_1.disabilityController.save(req.body, {})
        .then(r => res.status(r.status).json(r))
        .catch(e => res.status(e.status).json(e));
});
exports.DisabilityRouter.put('/:id', (req, res) => {
    disability_1.disabilityController.updateId(req.params.id, req.body)
        .then(r => res.status(r.status).json(r))
        .catch(e => res.status(e.status).json(e));
});
exports.DisabilityRouter.delete('/:id', (req, res) => {
    disability_1.disabilityController.deleteId(req.params.id)
        .then(r => res.status(r.status).json(r))
        .catch(e => res.status(e.status).json(e));
});

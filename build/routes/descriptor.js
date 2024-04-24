"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DescriptorRouter = void 0;
const express_1 = require("express");
const descriptor_1 = require("../controller/descriptor");
exports.DescriptorRouter = (0, express_1.Router)();
exports.DescriptorRouter.get('/', (req, res) => {
    descriptor_1.descriptorController.findAllWhere({}, req)
        .then(r => res.status(r.status).json(r))
        .catch(e => res.status(e.status).json(e));
});
exports.DescriptorRouter.get('/:id', (req, res) => {
    descriptor_1.descriptorController.findOneById(req.params.id, req)
        .then(r => res.status(r.status).json(r))
        .catch(e => res.status(e.status).json(e));
});
exports.DescriptorRouter.post('/', (req, res) => {
    descriptor_1.descriptorController.save(req.body, {})
        .then(r => res.status(r.status).json(r))
        .catch(e => res.status(e.status).json(e));
});
exports.DescriptorRouter.put('/:id', (req, res) => {
    descriptor_1.descriptorController.updateId(req.params.id, req.body)
        .then(r => res.status(r.status).json(r))
        .catch(e => res.status(e.status).json(e));
});
exports.DescriptorRouter.delete('/:id', (req, res) => {
    descriptor_1.descriptorController.deleteId(req.params.id)
        .then(r => res.status(r.status).json(r))
        .catch(e => res.status(e.status).json(e));
});

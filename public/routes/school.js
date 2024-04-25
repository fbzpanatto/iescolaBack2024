"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SchoolRouter = void 0;
const express_1 = require("express");
const school_1 = require("../controller/school");
exports.SchoolRouter = (0, express_1.Router)();
exports.SchoolRouter.get('/', (req, res) => {
    school_1.schoolController.findAllWhere({})
        .then(r => res.status(r.status).json(r))
        .catch(e => res.status(e.status).json(e));
});
exports.SchoolRouter.get('/:id', (req, res) => {
    school_1.schoolController.findOneById(req.params.id, req)
        .then(r => res.status(r.status).json(r))
        .catch(e => res.status(e.status).json(e));
});
exports.SchoolRouter.post('/', (req, res) => {
    school_1.schoolController.save(req.body, {})
        .then(r => res.status(r.status).json(r))
        .catch(e => res.status(e.status).json(e));
});
exports.SchoolRouter.put('/:id', (req, res) => {
    school_1.schoolController.updateId(req.params.id, req.body)
        .then(r => res.status(r.status).json(r))
        .catch(e => res.status(e.status).json(e));
});
exports.SchoolRouter.delete('/:id', (req, res) => {
    school_1.schoolController.deleteId(req.params.id)
        .then(r => res.status(r.status).json(r))
        .catch(e => res.status(e.status).json(e));
});

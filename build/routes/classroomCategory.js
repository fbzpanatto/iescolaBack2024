"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CassroomCategoryRouter = void 0;
const express_1 = require("express");
const classroomCategory_1 = require("../controller/classroomCategory");
exports.CassroomCategoryRouter = (0, express_1.Router)();
exports.CassroomCategoryRouter.get('/', (req, res) => {
    classroomCategory_1.classroomCategoryController.findAllWhere({})
        .then(r => res.status(r.status).json(r))
        .catch(e => res.status(e.status).json(e));
});
exports.CassroomCategoryRouter.get('/:id', (req, res) => {
    classroomCategory_1.classroomCategoryController.findOneById(req.params.id, req)
        .then(r => res.status(r.status).json(r))
        .catch(e => res.status(e.status).json(e));
});
exports.CassroomCategoryRouter.post('/', (req, res) => {
    classroomCategory_1.classroomCategoryController.save(req.body, {})
        .then(r => res.status(r.status).json(r))
        .catch(e => res.status(e.status).json(e));
});
exports.CassroomCategoryRouter.put('/:id', (req, res) => {
    classroomCategory_1.classroomCategoryController.updateId(req.params.id, req.body)
        .then(r => res.status(r.status).json(r))
        .catch(e => res.status(e.status).json(e));
});
exports.CassroomCategoryRouter.delete('/:id', (req, res) => {
    classroomCategory_1.classroomCategoryController.deleteId(req.params.id)
        .then(r => res.status(r.status).json(r))
        .catch(e => res.status(e.status).json(e));
});

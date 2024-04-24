"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TestCategoryRouter = void 0;
const express_1 = require("express");
const testCategory_1 = require("../controller/testCategory");
exports.TestCategoryRouter = (0, express_1.Router)();
exports.TestCategoryRouter.get('/', (req, res) => {
    testCategory_1.testCategoryController.findAllWhere({})
        .then(r => res.status(r.status).json(r))
        .catch(e => res.status(e.status).json(e));
});
exports.TestCategoryRouter.get('/:id', (req, res) => {
    testCategory_1.testCategoryController.findOneById(req.params.id, req)
        .then(r => res.status(r.status).json(r))
        .catch(e => res.status(e.status).json(e));
});
exports.TestCategoryRouter.post('/', (req, res) => {
    testCategory_1.testCategoryController.save(req.body, {})
        .then(r => res.status(r.status).json(r))
        .catch(e => res.status(e.status).json(e));
});
exports.TestCategoryRouter.put('/:id', (req, res) => {
    testCategory_1.testCategoryController.updateId(req.params.id, req.body)
        .then(r => res.status(r.status).json(r))
        .catch(e => res.status(e.status).json(e));
});
exports.TestCategoryRouter.delete('/:id', (req, res) => {
    testCategory_1.testCategoryController.deleteId(req.params.id)
        .then(r => res.status(r.status).json(r))
        .catch(e => res.status(e.status).json(e));
});

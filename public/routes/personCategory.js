"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PersonCategoryRouter = void 0;
const express_1 = require("express");
const personCategory_1 = require("../controller/personCategory");
const havePermission_1 = __importDefault(require("../middleware/havePermission"));
exports.PersonCategoryRouter = (0, express_1.Router)();
exports.PersonCategoryRouter.get('/', havePermission_1.default, (req, res) => {
    personCategory_1.personCategoryController.findAllWhere({}, req)
        .then(r => res.status(r.status).json(r))
        .catch(e => res.status(e.status).json(e));
});
exports.PersonCategoryRouter.get('/:id', havePermission_1.default, (req, res) => {
    personCategory_1.personCategoryController.findOneById(req.params.id, req)
        .then(r => res.status(r.status).json(r))
        .catch(e => res.status(e.status).json(e));
});
exports.PersonCategoryRouter.post('/', havePermission_1.default, (req, res) => {
    personCategory_1.personCategoryController.save(req.body, {})
        .then(r => res.status(r.status).json(r))
        .catch(e => res.status(e.status).json(e));
});
exports.PersonCategoryRouter.put('/:id', havePermission_1.default, (req, res) => {
    personCategory_1.personCategoryController.updateId(req.params.id, req.body)
        .then(r => res.status(r.status).json(r))
        .catch(e => res.status(e.status).json(e));
});
exports.PersonCategoryRouter.delete('/:id', havePermission_1.default, (req, res) => {
    personCategory_1.personCategoryController.deleteId(req.params.id)
        .then(r => res.status(r.status).json(r))
        .catch(e => res.status(e.status).json(e));
});

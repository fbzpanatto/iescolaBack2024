"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.YearRouter = void 0;
const express_1 = require("express");
const year_1 = require("../controller/year");
const havePermission_1 = __importDefault(require("../middleware/havePermission"));
exports.YearRouter = (0, express_1.Router)();
exports.YearRouter.get('/', havePermission_1.default, (req, res) => {
    year_1.yearController.findAllWhere({}, req)
        .then(r => res.status(r.status).json(r))
        .catch(e => res.status(e.status).json(e));
});
exports.YearRouter.get('/:id', havePermission_1.default, (req, res) => {
    year_1.yearController.findOneById(req.params.id, req.body)
        .then(r => res.status(r.status).json(r))
        .catch(e => res.status(e.status).json(e));
});
exports.YearRouter.post('/', havePermission_1.default, (req, res) => {
    year_1.yearController.save(req.body, {})
        .then(r => res.status(r.status).json(r))
        .catch(e => res.status(e.status).json(e));
});
exports.YearRouter.put('/:id', havePermission_1.default, (req, res) => {
    year_1.yearController.updateId(req.params.id, req.body)
        .then(r => res.status(r.status).json(r))
        .catch(e => res.status(e.status).json(e));
});
exports.YearRouter.delete('/:id', havePermission_1.default, (req, res) => {
    year_1.yearController.deleteId(req.params.id)
        .then(r => res.status(r.status).json(r))
        .catch(e => res.status(e.status).json(e));
});

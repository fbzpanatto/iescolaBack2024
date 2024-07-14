"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.YearRouter = void 0;
const express_1 = require("express");
const year_1 = require("../controller/year");
const validators_1 = require("../middleware/validators");
const havePermission_1 = __importDefault(require("../middleware/havePermission"));
const CREATE_VALIDATORS = [validators_1.VALIDATE_YEAR, validators_1.BODY_VALIDATION_YEAR];
const UPDATE_VALIDATORS = [validators_1.PARAM_ID, validators_1.VALIDATE_YEAR, validators_1.BODY_VALIDATION_YEAR];
exports.YearRouter = (0, express_1.Router)();
exports.YearRouter.get('/', havePermission_1.default, (req, res) => {
    year_1.yearController.findAllWhere({}, req)
        .then(r => res.status(r.status).json(r))
        .catch(e => res.status(e.status).json(e));
});
exports.YearRouter.get('/:id', validators_1.PARAM_ID, havePermission_1.default, (req, res) => {
    year_1.yearController.findOneById(req.params.id, req.body)
        .then(r => res.status(r.status).json(r))
        .catch(e => res.status(e.status).json(e));
});
exports.YearRouter.post('/', ...CREATE_VALIDATORS, havePermission_1.default, (req, res) => {
    year_1.yearController.save(req.body, {})
        .then(r => res.status(r.status).json(r))
        .catch(e => res.status(e.status).json(e));
});
exports.YearRouter.put('/:id', ...UPDATE_VALIDATORS, havePermission_1.default, (req, res) => {
    year_1.yearController.updateId(req.params.id, req.body)
        .then(r => res.status(r.status).json(r))
        .catch(e => res.status(e.status).json(e));
});
exports.YearRouter.delete('/:id', validators_1.PARAM_ID, havePermission_1.default, (req, res) => {
    year_1.yearController.deleteId(req.params.id)
        .then(r => res.status(r.status).json(r))
        .catch(e => res.status(e.status).json(e));
});

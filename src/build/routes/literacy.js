"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LiteracyRouter = void 0;
const express_1 = require("express");
const literacy_1 = require("../controller/literacy");
const havePermission_1 = __importDefault(require("../middleware/havePermission"));
exports.LiteracyRouter = (0, express_1.Router)();
exports.LiteracyRouter.get('/:year', havePermission_1.default, (req, res) => {
    literacy_1.literacyController.getClassrooms(req)
        .then(r => res.status(r.status).json(r))
        .catch(e => res.status(e.status).json(e));
});
exports.LiteracyRouter.get('/:id/:year/classroom', havePermission_1.default, (req, res) => {
    literacy_1.literacyController.getStudentClassrooms(req)
        .then(r => res.status(r.status).json(r))
        .catch(e => res.status(e.status).json(e));
});
exports.LiteracyRouter.get('/:id/:year/totals', havePermission_1.default, (req, res) => {
    literacy_1.literacyController.getTotals(req)
        .then(r => res.status(r.status).json(r))
        .catch(e => res.status(e.status).json(e));
});
exports.LiteracyRouter.put('/:id/classroom', havePermission_1.default, (req, res) => {
    literacy_1.literacyController.updateLiteracy(req.body)
        .then(r => res.status(r.status).json(r))
        .catch(e => res.status(e.status).json(e));
});
exports.LiteracyRouter.put('/many', havePermission_1.default, (req, res) => {
    literacy_1.literacyController.updateMany(req.body)
        .then(r => res.status(r.status).json(r))
        .catch(e => res.status(e.status).json(e));
});

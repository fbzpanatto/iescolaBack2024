"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReportRouter = void 0;
const express_1 = require("express");
const report_1 = require("../controller/report");
const havePermission_1 = __importDefault(require("../middleware/havePermission"));
exports.ReportRouter = (0, express_1.Router)();
exports.ReportRouter.get('/:year', havePermission_1.default, (req, res) => {
    report_1.reportController.findAllWhere({}, req)
        .then(r => res.status(r.status).json(r))
        .catch(e => res.status(e.status).json(e));
});
exports.ReportRouter.get('/:id/:year', havePermission_1.default, (req, res) => {
    report_1.reportController.getReport(req)
        .then(r => res.status(r.status).json(r))
        .catch(e => res.status(e.status).json(e));
});
exports.ReportRouter.get('/:id/:year/avg', havePermission_1.default, (req, res) => {
    report_1.reportController.getSchoolAvg(req)
        .then(r => res.status(r.status).json(r))
        .catch(e => res.status(e.status).json(e));
});

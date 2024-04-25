"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReportLiteracyRouter = void 0;
const express_1 = require("express");
const report_literacy_controller_1 = require("../controller/report-literacy-controller");
const havePermission_1 = __importDefault(require("../middleware/havePermission"));
exports.ReportLiteracyRouter = (0, express_1.Router)();
exports.ReportLiteracyRouter.get('/:classroom/:year', havePermission_1.default, (req, res) => {
    report_literacy_controller_1.reportLiteracyController.getReport(req)
        .then(r => res.status(r.status).json(r))
        .catch(e => res.status(e.status).json(e));
});

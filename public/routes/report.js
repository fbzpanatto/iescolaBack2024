"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReportRouter = void 0;
const express_1 = require("express");
const report_1 = require("../controller/report");
const havePermission_1 = __importDefault(require("../middleware/havePermission"));
exports.ReportRouter = (0, express_1.Router)();
exports.ReportRouter.get('/:year', havePermission_1.default, (req, res) => __awaiter(void 0, void 0, void 0, function* () { const data = yield report_1.reportController.findAllWhere({}, req); return res.status(data.status).json(data); }));
exports.ReportRouter.get('/:id/:year', havePermission_1.default, (req, res) => __awaiter(void 0, void 0, void 0, function* () { const data = yield report_1.reportController.getReport(req); return res.status(data.status).json(data); }));
exports.ReportRouter.get('/:id/:year/avg', havePermission_1.default, (req, res) => __awaiter(void 0, void 0, void 0, function* () { const data = yield report_1.reportController.getSchoolAvg(req); return res.status(data.status).json(data); }));

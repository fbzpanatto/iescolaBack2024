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
exports.YearRouter = void 0;
const express_1 = require("express");
const year_1 = require("../controller/year");
const validators_1 = require("../middleware/validators");
const havePermission_1 = __importDefault(require("../middleware/havePermission"));
const CREATE_VALIDATORS = [validators_1.VALIDATE_YEAR, validators_1.BODY_VALIDATION_YEAR];
const UPDATE_VALIDATORS = [validators_1.ID_PARAM, validators_1.VALIDATE_YEAR, validators_1.BODY_VALIDATION_YEAR];
exports.YearRouter = (0, express_1.Router)();
exports.YearRouter.get('/', havePermission_1.default, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const response = yield year_1.yearController.findAllWhere({}, req);
    return res.status(response.status).json(response);
}));
exports.YearRouter.get('/:id', validators_1.ID_PARAM, havePermission_1.default, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const response = yield year_1.yearController.findOneById(req.params.id, req.body);
    return res.status(response.status).json(response);
}));
exports.YearRouter.post('/', ...CREATE_VALIDATORS, havePermission_1.default, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const response = yield year_1.yearController.save(req.body);
    return res.status(response.status).json(response);
}));
exports.YearRouter.put('/:id', ...UPDATE_VALIDATORS, havePermission_1.default, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const response = yield year_1.yearController.updateId(req.params.id, req.body);
    return res.status(response.status).json(response);
}));

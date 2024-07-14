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
Object.defineProperty(exports, "__esModule", { value: true });
exports.DisabilityRouter = void 0;
const express_1 = require("express");
const disability_1 = require("../controller/disability");
const validators_1 = require("../middleware/validators");
exports.DisabilityRouter = (0, express_1.Router)();
exports.DisabilityRouter.get('/', (req, res) => __awaiter(void 0, void 0, void 0, function* () { const response = yield disability_1.disabilityController.findAllWhere({}); return res.status(response.status).json(response); }));
exports.DisabilityRouter.get('/:id', validators_1.ID_PARAM, (req, res) => __awaiter(void 0, void 0, void 0, function* () { const response = yield disability_1.disabilityController.findOneById(req.params.id, req); return res.status(response.status).json(response); }));
exports.DisabilityRouter.post('/', (req, res) => __awaiter(void 0, void 0, void 0, function* () { const response = yield disability_1.disabilityController.save(req.body, {}); return res.status(response.status).json(response); }));
exports.DisabilityRouter.put('/:id', validators_1.ID_PARAM, (req, res) => __awaiter(void 0, void 0, void 0, function* () { const response = yield disability_1.disabilityController.updateId(req.params.id, req.body); return res.status(response.status).json(response); }));

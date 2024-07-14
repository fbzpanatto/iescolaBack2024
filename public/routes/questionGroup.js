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
exports.QGroupR = void 0;
const express_1 = require("express");
const questionGroup_1 = require("../controller/questionGroup");
const validators_1 = require("../middleware/validators");
exports.QGroupR = (0, express_1.Router)();
exports.QGroupR.get('/', (req, res) => __awaiter(void 0, void 0, void 0, function* () { const data = yield questionGroup_1.qGroupCtrl.findAllWhere({}); return res.status(data.status).json(data); }));
exports.QGroupR.get('/:id', validators_1.ID_PARAM, (req, res) => __awaiter(void 0, void 0, void 0, function* () { const data = yield questionGroup_1.qGroupCtrl.findOneById(req.params.id, req); return res.status(data.status).json(data); }));
exports.QGroupR.post('/', (req, res) => __awaiter(void 0, void 0, void 0, function* () { const data = yield questionGroup_1.qGroupCtrl.save(req.body, {}); return res.status(data.status).json(data); }));
exports.QGroupR.put('/:id', validators_1.ID_PARAM, (req, res) => __awaiter(void 0, void 0, void 0, function* () { const data = yield questionGroup_1.qGroupCtrl.updateId(req.params.id, req.body); return res.status(data.status).json(data); }));

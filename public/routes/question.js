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
exports.QuesR = void 0;
const express_1 = require("express");
const question_1 = require("../controller/question");
exports.QuesR = (0, express_1.Router)();
exports.QuesR.get('/form', (req, res) => __awaiter(void 0, void 0, void 0, function* () { const data = yield question_1.quesCtrl.questionForm(req); return res.status(data.status).json(data); }));
exports.QuesR.get('/owner/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () { const data = yield question_1.quesCtrl.isOwner(req); return res.status(data.status).json(data); }));
exports.QuesR.get('/', (req, res) => __awaiter(void 0, void 0, void 0, function* () { const data = yield question_1.quesCtrl.allQuestions(req); return res.status(data.status).json(data); }));
exports.QuesR.get('/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () { const data = yield question_1.quesCtrl.findOneById(req.params.id, req); return res.status(data.status).json(data); }));
exports.QuesR.post('/', (req, res) => __awaiter(void 0, void 0, void 0, function* () { const data = yield question_1.quesCtrl.save(req.body, {}); return res.status(data.status).json(data); }));
exports.QuesR.put('/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () { const data = yield question_1.quesCtrl.updateId(req.params.id, req.body); return res.status(data.status).json(data); }));

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
exports.DisciplineRouter = void 0;
const express_1 = require("express");
const discipline_1 = require("../controller/discipline");
const validators_1 = require("../middleware/validators");
exports.DisciplineRouter = (0, express_1.Router)();
exports.DisciplineRouter.get('/', (req, res) => __awaiter(void 0, void 0, void 0, function* () { const response = yield discipline_1.discController.getAllDisciplines(req); return res.status(response.status).json(response); }));
exports.DisciplineRouter.get('/:id', validators_1.ID_PARAM, (req, res) => __awaiter(void 0, void 0, void 0, function* () { var _a; const response = yield discipline_1.discController.findOneById((_a = req.params) === null || _a === void 0 ? void 0 : _a.id, req); return res.status(response.status).json(response); }));
exports.DisciplineRouter.post('/', (req, res) => __awaiter(void 0, void 0, void 0, function* () { const response = yield discipline_1.discController.save(req.body, {}); return res.status(response.status).json(response); }));
exports.DisciplineRouter.put('/:id', validators_1.ID_PARAM, (req, res) => __awaiter(void 0, void 0, void 0, function* () { var _b; const response = yield discipline_1.discController.updateId((_b = req.params) === null || _b === void 0 ? void 0 : _b.id, req.body); return res.status(response.status).json(response); }));

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
exports.BimesterRouter = void 0;
const express_1 = require("express");
const bimester_1 = require("../controller/bimester");
const validators_1 = require("../middleware/validators");
exports.BimesterRouter = (0, express_1.Router)();
exports.BimesterRouter.get('/', (req, res) => __awaiter(void 0, void 0, void 0, function* () { const response = yield bimester_1.bimesterController.findAllWhere(); return res.status(response.status).json(response); }));
exports.BimesterRouter.get('/:id', validators_1.ID_PARAM, (req, res) => __awaiter(void 0, void 0, void 0, function* () { const response = yield bimester_1.bimesterController.findOneById(req.params.id, req); return res.status(response.status).json(response); }));
exports.BimesterRouter.post('/', (req, res) => __awaiter(void 0, void 0, void 0, function* () { const response = yield bimester_1.bimesterController.save(req.body, {}); return res.status(response.status).json(response); }));
exports.BimesterRouter.put('/:id', validators_1.ID_PARAM, (req, res) => __awaiter(void 0, void 0, void 0, function* () { const response = yield bimester_1.bimesterController.updateId(req.params.id, req.body); return res.status(response.status).json(response); }));

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
exports.PeCatRouter = void 0;
const express_1 = require("express");
const personCategory_1 = require("../controller/personCategory");
const havePermission_1 = __importDefault(require("../middleware/havePermission"));
const validators_1 = require("../middleware/validators");
exports.PeCatRouter = (0, express_1.Router)();
exports.PeCatRouter.get('/', havePermission_1.default, (req, res) => __awaiter(void 0, void 0, void 0, function* () { const response = yield personCategory_1.pCatCtrl.findAllPerCat(req); return res.status(response.status).json(response); }));
exports.PeCatRouter.get('/:id', validators_1.ID_PARAM, havePermission_1.default, (req, res) => __awaiter(void 0, void 0, void 0, function* () { const response = yield personCategory_1.pCatCtrl.findOneById(req.params.id, req); return res.status(response.status).json(response); }));
exports.PeCatRouter.post('/', havePermission_1.default, (req, res) => __awaiter(void 0, void 0, void 0, function* () { const response = yield personCategory_1.pCatCtrl.save(req.body, {}); return res.status(response.status).json(response); }));
exports.PeCatRouter.put('/:id', validators_1.ID_PARAM, havePermission_1.default, (req, res) => __awaiter(void 0, void 0, void 0, function* () { const response = yield personCategory_1.pCatCtrl.updateId(req.params.id, req.body); return res.status(response.status).json(response); }));

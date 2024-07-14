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
exports.CassroomCategoryRouter = void 0;
const express_1 = require("express");
const classroomCategory_1 = require("../controller/classroomCategory");
exports.CassroomCategoryRouter = (0, express_1.Router)();
exports.CassroomCategoryRouter.get('/', (req, res) => __awaiter(void 0, void 0, void 0, function* () { const response = yield classroomCategory_1.classCatController.findAllWhere({}); return res.status(response.status).json(response); }));
exports.CassroomCategoryRouter.get('/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () { const response = yield classroomCategory_1.classCatController.findOneById(req.params.id, req); return res.status(response.status).json(response); }));
exports.CassroomCategoryRouter.post('/', (req, res) => __awaiter(void 0, void 0, void 0, function* () { const response = yield classroomCategory_1.classCatController.save(req.body, {}); return res.status(response.status).json(response); }));
exports.CassroomCategoryRouter.put('/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () { const response = yield classroomCategory_1.classCatController.updateId(req.params.id, req.body); return res.status(response.status).json(response); }));

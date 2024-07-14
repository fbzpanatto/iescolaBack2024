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
exports.ClassroomRouter = void 0;
const express_1 = require("express");
const classroom_1 = require("../controller/classroom");
const validators_1 = require("../middleware/validators");
exports.ClassroomRouter = (0, express_1.Router)();
exports.ClassroomRouter.get('/', (req, res) => __awaiter(void 0, void 0, void 0, function* () { const response = yield classroom_1.classroomController.getAllClassrooms(req); return res.status(response.status).json(response); }));
exports.ClassroomRouter.get('/:id', validators_1.ID_PARAM, (req, res) => __awaiter(void 0, void 0, void 0, function* () { const response = yield classroom_1.classroomController.findOneById(req.params.id, req); return res.status(response.status).json(response); }));
exports.ClassroomRouter.post('/', (req, res) => __awaiter(void 0, void 0, void 0, function* () { const response = yield classroom_1.classroomController.save(req.body, {}); return res.status(response.status).json(response); }));
exports.ClassroomRouter.put('/:id', validators_1.ID_PARAM, (req, res) => __awaiter(void 0, void 0, void 0, function* () { const response = yield classroom_1.classroomController.updateId(req.params.id, req.body); return res.status(response.status).json(response); }));

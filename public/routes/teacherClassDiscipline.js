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
exports.TeacherClassDisciplineRouter = void 0;
const express_1 = require("express");
const teacherClassDiscipline_1 = require("../controller/teacherClassDiscipline");
const validators_1 = require("../middleware/validators");
exports.TeacherClassDisciplineRouter = (0, express_1.Router)();
exports.TeacherClassDisciplineRouter.get('/', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const response = yield teacherClassDiscipline_1.teacherRelationController.findAllWhere({});
    return res.status(response.status).json(response);
}));
exports.TeacherClassDisciplineRouter.get('/:id', validators_1.ID_PARAM, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const response = yield teacherClassDiscipline_1.teacherRelationController.findOneById(req.params.id, req);
    return res.status(response.status).json(response);
}));
exports.TeacherClassDisciplineRouter.post('/', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const response = yield teacherClassDiscipline_1.teacherRelationController.save(req.body, {});
    return res.status(response.status).json(response);
}));
exports.TeacherClassDisciplineRouter.put('/:id', validators_1.ID_PARAM, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const response = yield teacherClassDiscipline_1.teacherRelationController.updateId(req.params.id, req.body);
    return res.status(response.status).json(response);
}));

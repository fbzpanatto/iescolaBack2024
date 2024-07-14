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
exports.TextGenderClassroomRouter = void 0;
const express_1 = require("express");
const textGenderClassroom_1 = require("../controller/textGenderClassroom");
const validators_1 = require("../middleware/validators");
exports.TextGenderClassroomRouter = (0, express_1.Router)();
exports.TextGenderClassroomRouter.get('/:id', validators_1.ID_PARAM, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const response = yield textGenderClassroom_1.textGenderClassroomController.getTabs(req);
    return res.status(response.status).json(response);
}));
exports.TextGenderClassroomRouter.get('/report/:classroomNumber', validators_1.CLASSROOM_NUMBER_PARAM, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const response = yield textGenderClassroom_1.textGenderClassroomController.getTabsReport(req);
    return res.status(response.status).json(response);
}));

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
exports.SchoolRouter = void 0;
const express_1 = require("express");
const school_1 = require("../controller/school");
const validators_1 = require("../middleware/validators");
exports.SchoolRouter = (0, express_1.Router)();
exports.SchoolRouter.get('/', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const response = yield school_1.schoolController.findAllWhere({});
    return res.status(response.status).json(response);
}));
exports.SchoolRouter.get('/:id', validators_1.ID_PARAM, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const response = yield school_1.schoolController.findOneById(req.params.id, req);
    return res.status(response.status).json(response);
}));
exports.SchoolRouter.post('/', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const response = yield school_1.schoolController.save(req.body, {});
    return res.status(response.status).json(response);
}));
exports.SchoolRouter.put('/:id', validators_1.ID_PARAM, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const response = yield school_1.schoolController.updateId(req.params.id, req.body);
    return res.status(response.status).json(response);
}));

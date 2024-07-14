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
exports.TestCategoryRouter = void 0;
const express_1 = require("express");
const testCategory_1 = require("../controller/testCategory");
const validators_1 = require("../middleware/validators");
exports.TestCategoryRouter = (0, express_1.Router)();
exports.TestCategoryRouter.get('/', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const response = yield testCategory_1.testCategoryController.findAllWhere({});
    return res.status(response.status).json(response);
}));
exports.TestCategoryRouter.get('/:id', validators_1.ID_PARAM, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const response = yield testCategory_1.testCategoryController.findOneById(req.params.id, req);
    return res.status(response.status).json(response);
}));
exports.TestCategoryRouter.post('/', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const response = yield testCategory_1.testCategoryController.save(req.body, {});
    return res.status(response.status).json(response);
}));
exports.TestCategoryRouter.put('/:id', validators_1.ID_PARAM, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const response = yield testCategory_1.testCategoryController.updateId(req.params.id, req.body);
    return res.status(response.status).json(response);
}));

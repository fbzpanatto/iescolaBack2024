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
exports.StateRouter = void 0;
const express_1 = require("express");
const state_1 = require("../controller/state");
const validators_1 = require("../middleware/validators");
exports.StateRouter = (0, express_1.Router)();
exports.StateRouter.get('/', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const response = yield state_1.stateController.findAllWhere({});
    return res.status(response.status).json(response);
}));
exports.StateRouter.get('/:id', validators_1.ID_PARAM, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const response = yield state_1.stateController.findOneById(req.params.id, req);
    return res.status(response.status).json(response);
}));
exports.StateRouter.post('/', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const response = yield state_1.stateController.save(req.body, {});
    return res.status(response.status).json(response);
}));
exports.StateRouter.put('/:id', validators_1.ID_PARAM, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const response = yield state_1.stateController.updateId(req.params.id, req.body);
    return res.status(response.status).json(response);
}));

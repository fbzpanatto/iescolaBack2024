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
exports.TopicRouter = void 0;
const express_1 = require("express");
const topic_1 = require("../controller/topic");
const validators_1 = require("../middleware/validators");
exports.TopicRouter = (0, express_1.Router)();
exports.TopicRouter.get('/', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const response = yield topic_1.topicController.findAllWhere({}, req);
    return res.status(response.status).json(response);
}));
exports.TopicRouter.get('/:id', validators_1.ID_PARAM, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const response = yield topic_1.topicController.findOneById((_a = req.params) === null || _a === void 0 ? void 0 : _a.id, req);
    return res.status(response.status).json(response);
}));
exports.TopicRouter.post('/', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const response = yield topic_1.topicController.save(req.body, {});
    return res.status(response.status).json(response);
}));
exports.TopicRouter.put('/:id', validators_1.ID_PARAM, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _b;
    const response = yield topic_1.topicController.updateId((_b = req.params) === null || _b === void 0 ? void 0 : _b.id, req.body);
    return res.status(response.status).json(response);
}));

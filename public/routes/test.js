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
exports.TestRouter = void 0;
const express_1 = require("express");
const test_1 = require("../controller/test");
const validators_1 = require("../middleware/validators");
const havePermission_1 = __importDefault(require("../middleware/havePermission"));
const CREATE_VALIDATORS = [validators_1.VALIDATE_TEST, validators_1.BODY_VALIDATION_TEST];
const UPDATE_VALIDATORS = [validators_1.VALIDATE_ID, validators_1.VALIDATE_TEST, validators_1.BODY_VALIDATION_TEST];
exports.TestRouter = (0, express_1.Router)();
exports.TestRouter.get('/form', havePermission_1.default, (req, res) => {
    test_1.testController.getFormData(req)
        .then(r => res.status(r.status).json(r))
        .catch(e => res.status(e.status).json(e));
});
exports.TestRouter.get('/:year/all', havePermission_1.default, (req, res) => {
    test_1.testController.findAllWhere({}, req)
        .then(r => res.status(r.status).json(r))
        .catch(e => res.status(e.status).json(e));
});
exports.TestRouter.get('/:id/:year/:classroom', havePermission_1.default, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const response = yield test_1.testController.getAllClassroomStudents(req);
    return res.status(response.status).json(response);
}));
exports.TestRouter.get('/:id/classroom/:classroom/graphic', havePermission_1.default, (req, res) => {
    test_1.testController.getGraphic(req)
        .then(r => res.status(r.status).json(r))
        .catch(e => res.status(e.status).json(e));
});
exports.TestRouter.get('/:id/:year/:classroom/include', havePermission_1.default, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const response = yield test_1.testController.getAllToInsert(req);
    return res.status(response.status).json(response);
}));
exports.TestRouter.get('/:id', havePermission_1.default, (req, res) => {
    test_1.testController.findOneById(req.params.id, req)
        .then(r => res.status(r.status).json(r))
        .catch(e => res.status(e.status).json(e));
});
exports.TestRouter.post('/:id/:classroom/include', havePermission_1.default, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const response = yield test_1.testController.insertStudents(req);
    return res.status(response.status).json(response);
}));
exports.TestRouter.post('/', ...CREATE_VALIDATORS, havePermission_1.default, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const response = yield test_1.testController.saveTest(req.body);
    return res.status(response.status).json(response);
}));
exports.TestRouter.put('/:id', ...UPDATE_VALIDATORS, havePermission_1.default, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const response = yield test_1.testController.updateTestById(req.params.id, req);
    return res.status(response.status).json(response);
}));
exports.TestRouter.delete('/:id', havePermission_1.default, (req, res) => {
    test_1.testController.deleteId(req)
        .then(r => res.status(r.status).json(r))
        .catch(e => res.status(e.status).json(e));
});

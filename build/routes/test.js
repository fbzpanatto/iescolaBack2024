"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TestRouter = void 0;
const express_1 = require("express");
const test_1 = require("../controller/test");
const havePermission_1 = __importDefault(require("../middleware/havePermission"));
exports.TestRouter = (0, express_1.Router)();
exports.TestRouter.get('/:year/all', havePermission_1.default, (req, res) => {
    test_1.testController.findAllWhere({}, req)
        .then(r => res.status(r.status).json(r))
        .catch(e => res.status(e.status).json(e));
});
exports.TestRouter.get('/:id/:year/:classroom', havePermission_1.default, (req, res) => {
    test_1.testController.getAllClassroomStudents({}, req)
        .then(r => res.status(r.status).json(r))
        .catch(e => res.status(e.status).json(e));
});
exports.TestRouter.get('/:id/classroom/:classroom/graphic', havePermission_1.default, (req, res) => {
    test_1.testController.getGraphic(req)
        .then(r => res.status(r.status).json(r))
        .catch(e => res.status(e.status).json(e));
});
exports.TestRouter.get('/:id/:year/:classroom/include', havePermission_1.default, (req, res) => {
    test_1.testController.getAllToInsert(req)
        .then(r => res.status(r.status).json(r))
        .catch(e => res.status(e.status).json(e));
});
exports.TestRouter.post('/:id/:classroom/include', havePermission_1.default, (req, res) => {
    test_1.testController.insertStudents(req.body)
        .then(r => res.status(r.status).json(r))
        .catch(e => res.status(e.status).json(e));
});
exports.TestRouter.get('/:id', havePermission_1.default, (req, res) => {
    test_1.testController.findOneById(req.params.id, req.body)
        .then(r => res.status(r.status).json(r))
        .catch(e => res.status(e.status).json(e));
});
exports.TestRouter.post('/', havePermission_1.default, (req, res) => {
    test_1.testController.save(req.body, {})
        .then(r => res.status(r.status).json(r))
        .catch(e => res.status(e.status).json(e));
});
exports.TestRouter.put('/:id', havePermission_1.default, (req, res) => {
    test_1.testController.updateId(req.params.id, req.body)
        .then(r => res.status(r.status).json(r))
        .catch(e => res.status(e.status).json(e));
});
exports.TestRouter.delete('/:id', havePermission_1.default, (req, res) => {
    test_1.testController.deleteId(req)
        .then(r => res.status(r.status).json(r))
        .catch(e => res.status(e.status).json(e));
});

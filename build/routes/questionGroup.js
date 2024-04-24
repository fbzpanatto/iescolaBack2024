"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.QuestionGroupRouter = void 0;
const express_1 = require("express");
const questionGroup_1 = require("../controller/questionGroup");
exports.QuestionGroupRouter = (0, express_1.Router)();
exports.QuestionGroupRouter.get('/', (req, res) => {
    questionGroup_1.questionGroupController.findAllWhere({})
        .then(r => res.status(r.status).json(r))
        .catch(e => res.status(e.status).json(e));
});
exports.QuestionGroupRouter.get('/:id', (req, res) => {
    questionGroup_1.questionGroupController.findOneById(req.params.id, req)
        .then(r => res.status(r.status).json(r))
        .catch(e => res.status(e.status).json(e));
});
exports.QuestionGroupRouter.post('/', (req, res) => {
    questionGroup_1.questionGroupController.save(req.body, {})
        .then(r => res.status(r.status).json(r))
        .catch(e => res.status(e.status).json(e));
});
exports.QuestionGroupRouter.put('/:id', (req, res) => {
    questionGroup_1.questionGroupController.updateId(req.params.id, req.body)
        .then(r => res.status(r.status).json(r))
        .catch(e => res.status(e.status).json(e));
});
exports.QuestionGroupRouter.delete('/:id', (req, res) => {
    questionGroup_1.questionGroupController.deleteId(req.params.id)
        .then(r => res.status(r.status).json(r))
        .catch(e => res.status(e.status).json(e));
});

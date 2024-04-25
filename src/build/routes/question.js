"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.QuestionRouter = void 0;
const express_1 = require("express");
const question_1 = require("../controller/question");
exports.QuestionRouter = (0, express_1.Router)();
exports.QuestionRouter.get('/', (req, res) => {
    question_1.questionController.findAllWhere({}, req)
        .then(r => res.status(r.status).json(r))
        .catch(e => res.status(e.status).json(e));
});
exports.QuestionRouter.get('/:id', (req, res) => {
    question_1.questionController.findOneById(req.params.id, req)
        .then(r => res.status(r.status).json(r))
        .catch(e => res.status(e.status).json(e));
});
exports.QuestionRouter.post('/', (req, res) => {
    question_1.questionController.save(req.body, {})
        .then(r => res.status(r.status).json(r))
        .catch(e => res.status(e.status).json(e));
});
exports.QuestionRouter.put('/:id', (req, res) => {
    question_1.questionController.updateId(req.params.id, req.body)
        .then(r => res.status(r.status).json(r))
        .catch(e => res.status(e.status).json(e));
});
exports.QuestionRouter.delete('/:id', (req, res) => {
    question_1.questionController.deleteId(req.params.id)
        .then(r => res.status(r.status).json(r))
        .catch(e => res.status(e.status).json(e));
});

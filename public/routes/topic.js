"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TopicRouter = void 0;
const express_1 = require("express");
const topic_1 = require("../controller/topic");
exports.TopicRouter = (0, express_1.Router)();
exports.TopicRouter.get('/', (req, res) => {
    topic_1.topicController.findAllWhere({}, req)
        .then(r => res.status(r.status).json(r))
        .catch(e => res.status(e.status).json(e));
});
exports.TopicRouter.get('/:id', (req, res) => {
    topic_1.topicController.findOneById(req.params.id, req)
        .then(r => res.status(r.status).json(r))
        .catch(e => res.status(e.status).json(e));
});
exports.TopicRouter.post('/', (req, res) => {
    topic_1.topicController.save(req.body, {})
        .then(r => res.status(r.status).json(r))
        .catch(e => res.status(e.status).json(e));
});
exports.TopicRouter.put('/:id', (req, res) => {
    topic_1.topicController.updateId(req.params.id, req.body)
        .then(r => res.status(r.status).json(r))
        .catch(e => res.status(e.status).json(e));
});
exports.TopicRouter.delete('/:id', (req, res) => {
    topic_1.topicController.deleteId(req.params.id)
        .then(r => res.status(r.status).json(r))
        .catch(e => res.status(e.status).json(e));
});

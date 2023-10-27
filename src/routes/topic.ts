import { Router } from "express";
import { topicController } from "../controller/topic";

export const TopicRouter = Router();

TopicRouter.get('/', (req, res) => {

  topicController.findAllWhere({}, req)
    .then(r => res.status(r.status).json(r))
    .catch(e => res.status(e.status).json(e))
})

TopicRouter.get('/:id', (req, res) => {

  topicController.findOneById(req.params.id, req)
    .then(r => res.status(r.status).json(r))
    .catch(e => res.status(e.status).json(e))
})

TopicRouter.post('/', (req, res) => {

  topicController.save(req.body, {})
    .then(r => res.status(r.status).json(r))
    .catch(e => res.status(e.status).json(e))
});

TopicRouter.put('/:id', (req, res) => {

  topicController.updateId(req.params.id, req.body)
    .then(r => res.status(r.status).json(r))
    .catch(e => res.status(e.status).json(e))
});

TopicRouter.delete('/:id', (req, res) => {

  topicController.deleteId(req.params.id)
    .then(r => res.status(r.status).json(r))
    .catch(e => res.status(e.status).json(e))
});

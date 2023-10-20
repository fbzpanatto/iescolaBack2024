import { Router } from "express";
import { questionGroupController } from "../controller/questionGroup";

export const QuestionGroupRouter = Router();

QuestionGroupRouter.get('/', (req, res) => {

  questionGroupController.findAllWhere({})
    .then(r => res.status(r.status).json(r))
    .catch(e => res.status(e.status).json(e))
})

QuestionGroupRouter.get('/:id', (req, res) => {

  questionGroupController.findOneById(req.params.id)
    .then(r => res.status(r.status).json(r))
    .catch(e => res.status(e.status).json(e))
})

QuestionGroupRouter.post('/', (req, res) => {

  questionGroupController.save(req.body, {})
    .then(r => res.status(r.status).json(r))
    .catch(e => res.status(e.status).json(e))
});

QuestionGroupRouter.put('/:id', (req, res) => {

  questionGroupController.updateId(req.params.id, req.body)
    .then(r => res.status(r.status).json(r))
    .catch(e => res.status(e.status).json(e))
});

QuestionGroupRouter.delete('/:id', (req, res) => {

  questionGroupController.deleteId(req.params.id)
    .then(r => res.status(r.status).json(r))
    .catch(e => res.status(e.status).json(e))
});

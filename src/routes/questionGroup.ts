import { Router } from "express";
import {questionGroupController} from "../controller/questionGroup";

export const QuestionRouter = Router();

QuestionRouter.get('/', (req, res) => {

  questionGroupController.findAllWhere({})
    .then(r => res.status(r.status).json(r))
    .catch(e => res.status(e.status).json(e))
})

QuestionRouter.get('/:id', (req, res) => {

  questionGroupController.findOneById(req.params.id)
    .then(r => res.status(r.status).json(r))
    .catch(e => res.status(e.status).json(e))
})

QuestionRouter.post('/', (req, res) => {

  questionGroupController.save(req.body, {})
    .then(r => res.status(r.status).json(r))
    .catch(e => res.status(e.status).json(e))
});

QuestionRouter.put('/:id', (req, res) => {

  questionGroupController.updateId(req.params.id, req.body)
    .then(r => res.status(r.status).json(r))
    .catch(e => res.status(e.status).json(e))
});

QuestionRouter.delete('/:id', (req, res) => {

  questionGroupController.deleteId(req.params.id)
    .then(r => res.status(r.status).json(r))
    .catch(e => res.status(e.status).json(e))
});

import { Router } from "express";
import { questionController } from "../controller/question";

export const QuestionRouter = Router();

QuestionRouter.get('/form', (req, res) => {

  questionController.questionForm(req)
    .then(r => res.status(r.status).json(r))
    .catch(e => res.status(e.status).json(e))
})

QuestionRouter.get('/owner/:id', (req, res) => {

  questionController.isOwner(req)
    .then(r => res.status(r.status).json(r))
    .catch(e => res.status(e.status).json(e))
})

QuestionRouter.get('/', (req, res) => {

  questionController.findAllWhere({}, req)
    .then(r => res.status(r.status).json(r))
    .catch(e => res.status(e.status).json(e))
})

QuestionRouter.get('/:id', (req, res) => {

  questionController.findOneById(req.params.id, req)
    .then(r => res.status(r.status).json(r))
    .catch(e => res.status(e.status).json(e))
})

QuestionRouter.post('/', (req, res) => {

  questionController.save(req.body, {})
    .then(r => res.status(r.status).json(r))
    .catch(e => res.status(e.status).json(e))
});

QuestionRouter.put('/:id', (req, res) => {

  questionController.updateId(req.params.id, req.body)
    .then(r => res.status(r.status).json(r))
    .catch(e => res.status(e.status).json(e))
});

QuestionRouter.delete('/:id', (req, res) => {

  questionController.deleteId(req.params.id)
    .then(r => res.status(r.status).json(r))
    .catch(e => res.status(e.status).json(e))
});

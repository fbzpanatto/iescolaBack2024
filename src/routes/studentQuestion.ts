import { Router } from "express";
import { studentQuestionController } from "../controller/StudentQuestion";

export const StudentQuestionRouter = Router();

StudentQuestionRouter.get('/', (req, res) => {

  studentQuestionController.findAllWhere({})
    .then(r => res.status(r.status).json(r))
    .catch(e => res.status(e.status).json(e))
})

StudentQuestionRouter.get('/:id', (req, res) => {

  studentQuestionController.findOneById(req.params.id, req)
    .then(r => res.status(r.status).json(r))
    .catch(e => res.status(e.status).json(e))
})

StudentQuestionRouter.post('/', (req, res) => {

  studentQuestionController.save(req.body, {})
    .then(r => res.status(r.status).json(r))
    .catch(e => res.status(e.status).json(e))
});

StudentQuestionRouter.put('/:id', (req, res) => {

  studentQuestionController.updateId(req.params.id, req.body)
    .then(r => res.status(r.status).json(r))
    .catch(e => res.status(e.status).json(e))
});

StudentQuestionRouter.delete('/:id', (req, res) => {

  studentQuestionController.deleteId(req.params.id)
    .then(r => res.status(r.status).json(r))
    .catch(e => res.status(e.status).json(e))
});

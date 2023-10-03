import { Router } from "express";
import { studentController } from "../controller/student";

export const StudentRouter = Router();

StudentRouter.get('/', (req, res) => {

  studentController.findAllWhere()
    .then(r => res.status(r.status).json(r))
    .catch(e => res.status(e.status).json(e))
})

StudentRouter.get('/:id', (req, res) => {

  studentController.findOneById(req.params.id)
    .then(r => res.status(r.status).json(r))
    .catch(e => res.status(e.status).json(e))
})

StudentRouter.post('/', (req, res) => {

  studentController.save(req.body, {})
    .then(r => res.status(r.status).json(r))
    .catch(e => res.status(e.status).json(e))
});

StudentRouter.put('/:id', (req, res) => {

  studentController.updateId(req.params.id, req.body)
    .then(r => res.status(r.status).json(r))
    .catch(e => res.status(e.status).json(e))
});

StudentRouter.delete('/:id', (req, res) => {

  studentController.deleteId(req.params.id)
    .then(r => res.status(r.status).json(r))
    .catch(e => res.status(e.status).json(e))
});

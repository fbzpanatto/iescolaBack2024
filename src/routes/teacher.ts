import { Router } from "express";
import { teacherController } from "../controller/teacher";

export const TeacherRouter = Router();

TeacherRouter.get('/', (req, res) => {

  teacherController.findAllWhere({})
    .then(r => res.status(r.status).json(r))
    .catch(e => res.status(e.status).json(e))
})

TeacherRouter.get('/:id', (req, res) => {

  teacherController.findOneById(req.params.id)
    .then(r => res.status(r.status).json(r))
    .catch(e => res.status(e.status).json(e))
})

TeacherRouter.post('/', (req, res) => {

  teacherController.save(req.body, {})
    .then(r => res.status(r.status).json(r))
    .catch(e => res.status(e.status).json(e))
});

TeacherRouter.put('/:id', (req, res) => {

  teacherController.updateId(req.params.id, req.body)
    .then(r => res.status(r.status).json(r))
    .catch(e => res.status(e.status).json(e))
});

TeacherRouter.delete('/:id', (req, res) => {

  teacherController.deleteId(req.params.id)
    .then(r => res.status(r.status).json(r))
    .catch(e => res.status(e.status).json(e))
});

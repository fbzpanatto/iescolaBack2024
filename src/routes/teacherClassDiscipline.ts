import { Router } from "express";
import { teacherClassDisciplineController } from "../controller/teacherClassDiscipline";

export const TeacherClassDisciplineRouter = Router();

TeacherClassDisciplineRouter.get('/', (req, res) => {

  teacherClassDisciplineController.findAllWhere({})
    .then(r => res.status(r.status).json(r))
    .catch(e => res.status(e.status).json(e))
})

TeacherClassDisciplineRouter.get('/:id', (req, res) => {

  teacherClassDisciplineController.findOneById(req.params.id, req)
    .then(r => res.status(r.status).json(r))
    .catch(e => res.status(e.status).json(e))
})

TeacherClassDisciplineRouter.post('/', (req, res) => {

  teacherClassDisciplineController.save(req.body, {})
    .then(r => res.status(r.status).json(r))
    .catch(e => res.status(e.status).json(e))
});

TeacherClassDisciplineRouter.put('/:id', (req, res) => {

  teacherClassDisciplineController.updateId(req.params.id, req.body)
    .then(r => res.status(r.status).json(r))
    .catch(e => res.status(e.status).json(e))
});

TeacherClassDisciplineRouter.delete('/:id', (req, res) => {

  teacherClassDisciplineController.deleteId(req.params.id)
    .then(r => res.status(r.status).json(r))
    .catch(e => res.status(e.status).json(e))
});

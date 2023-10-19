import { Router } from "express";
import {disciplineController} from "../controller/discipline";

export const DisciplineRouter = Router();

DisciplineRouter.get('/', (req, res) => {

  disciplineController.findAllWhere({}, req)
    .then(r => res.status(r.status).json(r))
    .catch(e => res.status(e.status).json(e))
})

DisciplineRouter.get('/:id', (req, res) => {

  disciplineController.findOneById(req.params.id)
    .then(r => res.status(r.status).json(r))
    .catch(e => res.status(e.status).json(e))
})

DisciplineRouter.post('/', (req, res) => {

  disciplineController.save(req.body, {})
    .then(r => res.status(r.status).json(r))
    .catch(e => res.status(e.status).json(e))
});

DisciplineRouter.put('/:id', (req, res) => {

  disciplineController.updateId(req.params.id, req.body)
    .then(r => res.status(r.status).json(r))
    .catch(e => res.status(e.status).json(e))
});

DisciplineRouter.delete('/:id', (req, res) => {

  disciplineController.deleteId(req.params.id)
    .then(r => res.status(r.status).json(r))
    .catch(e => res.status(e.status).json(e))
});

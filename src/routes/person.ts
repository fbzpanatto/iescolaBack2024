import { Router } from "express";
import { personController } from "../controller/person";

export const PersonRouter = Router();

PersonRouter.get('/', (req, res) => {

  personController.findAllWhere({})
    .then(r => res.status(r.status).json(r))
    .catch(e => res.status(e.status).json(e))
})

PersonRouter.get('/:id', (req, res) => {

  personController.findOneById(req.params.id, req)
    .then(r => res.status(r.status).json(r))
    .catch(e => res.status(e.status).json(e))
})

PersonRouter.post('/', (req, res) => {

  personController.save(req.body, {})
    .then(r => res.status(r.status).json(r))
    .catch(e => res.status(e.status).json(e))
});

PersonRouter.put('/:id', (req, res) => {

  personController.updateId(req.params.id, req.body)
    .then(r => res.status(r.status).json(r))
    .catch(e => res.status(e.status).json(e))
});

PersonRouter.delete('/:id', (req, res) => {

  personController.deleteId(req.params.id)
    .then(r => res.status(r.status).json(r))
    .catch(e => res.status(e.status).json(e))
});

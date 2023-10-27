import { Router } from "express";
import { stateController } from "../controller/state";

export const StateRouter = Router();

StateRouter.get('/', (req, res) => {

  stateController.findAllWhere({})
    .then(r => res.status(r.status).json(r))
    .catch(e => res.status(e.status).json(e))
})

StateRouter.get('/:id', (req, res) => {

  stateController.findOneById(req.params.id, req)
    .then(r => res.status(r.status).json(r))
    .catch(e => res.status(e.status).json(e))
})

StateRouter.post('/', (req, res) => {

  stateController.save(req.body, {})
    .then(r => res.status(r.status).json(r))
    .catch(e => res.status(e.status).json(e))
});

StateRouter.put('/:id', (req, res) => {

  stateController.updateId(req.params.id, req.body)
    .then(r => res.status(r.status).json(r))
    .catch(e => res.status(e.status).json(e))
});

StateRouter.delete('/:id', (req, res) => {

  stateController.deleteId(req.params.id)
    .then(r => res.status(r.status).json(r))
    .catch(e => res.status(e.status).json(e))
});

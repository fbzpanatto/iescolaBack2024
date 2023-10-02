import { Router } from "express";
import { disabilityController } from "../controller/disability";

export const DisabilityRouter = Router();

DisabilityRouter.get('/', (req, res) => {

  disabilityController.findAllWhere({})
    .then(r => res.status(r.status).json(r))
    .catch(e => res.status(e.status).json(e))
})

DisabilityRouter.get('/:id', (req, res) => {

  disabilityController.findOneById(req.params.id)
    .then(r => res.status(r.status).json(r))
    .catch(e => res.status(e.status).json(e))
})

DisabilityRouter.post('/', (req, res) => {

  disabilityController.save(req.body, {})
    .then(r => res.status(r.status).json(r))
    .catch(e => res.status(e.status).json(e))
});

DisabilityRouter.put('/:id', (req, res) => {

  disabilityController.updateId(req.params.id, req.body)
    .then(r => res.status(r.status).json(r))
    .catch(e => res.status(e.status).json(e))
});

DisabilityRouter.delete('/:id', (req, res) => {

  disabilityController.deleteId(req.params.id)
    .then(r => res.status(r.status).json(r))
    .catch(e => res.status(e.status).json(e))
});

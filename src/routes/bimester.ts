import { Router } from "express";
import { bimesterController } from "../controller/bimester";

export const BimesterRouter = Router();

BimesterRouter.get('/', (req, res) => {

  bimesterController.findAllWhere({})
    .then(r => res.status(r.status).json(r))
    .catch(e => res.status(e.status).json(e))
})

BimesterRouter.get('/:id', (req, res) => {

  bimesterController.findOneById(req.params.id)
    .then(r => res.status(r.status).json(r))
    .catch(e => res.status(e.status).json(e))
})

BimesterRouter.post('/', (req, res) => {

  bimesterController.save(req.body, {})
    .then(r => res.status(r.status).json(r))
    .catch(e => res.status(e.status).json(e))
});

BimesterRouter.put('/:id', (req, res) => {

  bimesterController.updateId(req.params.id, req.body)
    .then(r => res.status(r.status).json(r))
    .catch(e => res.status(e.status).json(e))
});

BimesterRouter.delete('/:id', (req, res) => {

  bimesterController.deleteId(req.params.id)
    .then(r => res.status(r.status).json(r))
    .catch(e => res.status(e.status).json(e))
});

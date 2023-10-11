import { Router } from "express";
import { transferController } from "../controller/transfer";

export const TransferRouter = Router();

TransferRouter.get('/', (req, res) => {

  transferController.findAllWhere({})
    .then(r => res.status(r.status).json(r))
    .catch(e => res.status(e.status).json(e))
})

TransferRouter.get('/:id', (req, res) => {

  transferController.findOneById(req.params.id)
    .then(r => res.status(r.status).json(r))
    .catch(e => res.status(e.status).json(e))
})

TransferRouter.post('/', (req, res) => {

  transferController.save(req.body, {})
    .then(r => res.status(r.status).json(r))
    .catch(e => res.status(e.status).json(e))
});

TransferRouter.put('/:id', (req, res) => {

  transferController.updateId(req.params.id, req.body)
    .then(r => res.status(r.status).json(r))
    .catch(e => res.status(e.status).json(e))
});

TransferRouter.delete('/:id', (req, res) => {

  transferController.deleteId(req.params.id)
    .then(r => res.status(r.status).json(r))
    .catch(e => res.status(e.status).json(e))
});

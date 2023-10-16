import { Router } from "express";
import { transferController } from "../controller/transfer";
import havePermission from "../middleware/havePermission";

export const TransferRouter = Router();

TransferRouter.get('/', havePermission, (req, res) => {

  transferController.findAllWhere({}, req)
    .then(r => res.status(r.status).json(r))
    .catch(e => res.status(e.status).json(e))
})

TransferRouter.get('/:id', havePermission, (req, res) => {

  transferController.findOneById(req.params.id)
    .then(r => res.status(r.status).json(r))
    .catch(e => res.status(e.status).json(e))
})

TransferRouter.post('/', havePermission, (req, res) => {

  transferController.save(req.body, {})
    .then(r => res.status(r.status).json(r))
    .catch(e => res.status(e.status).json(e))
});

TransferRouter.put('/:id', havePermission, (req, res) => {

  transferController.updateId(req.params.id, req.body)
    .then(r => res.status(r.status).json(r))
    .catch(e => res.status(e.status).json(e))
});

TransferRouter.delete('/:id', havePermission, (req, res) => {

  transferController.deleteId(req.params.id)
    .then(r => res.status(r.status).json(r))
    .catch(e => res.status(e.status).json(e))
});

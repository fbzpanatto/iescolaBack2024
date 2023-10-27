import { Router } from "express";
import { descriptorController } from "../controller/descriptor";

export const DescriptorRouter = Router();

DescriptorRouter.get('/', (req, res) => {

  descriptorController.findAllWhere({}, req)
    .then(r => res.status(r.status).json(r))
    .catch(e => res.status(e.status).json(e))
})

DescriptorRouter.get('/:id', (req, res) => {

  descriptorController.findOneById(req.params.id, req)
    .then(r => res.status(r.status).json(r))
    .catch(e => res.status(e.status).json(e))
})

DescriptorRouter.post('/', (req, res) => {

  descriptorController.save(req.body, {})
    .then(r => res.status(r.status).json(r))
    .catch(e => res.status(e.status).json(e))
});

DescriptorRouter.put('/:id', (req, res) => {

  descriptorController.updateId(req.params.id, req.body)
    .then(r => res.status(r.status).json(r))
    .catch(e => res.status(e.status).json(e))
});

DescriptorRouter.delete('/:id', (req, res) => {

  descriptorController.deleteId(req.params.id)
    .then(r => res.status(r.status).json(r))
    .catch(e => res.status(e.status).json(e))
});

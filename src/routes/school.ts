import { Router } from "express";
import { schoolController } from "../controller/school";

export const SchoolRouter = Router();

SchoolRouter.get('/', (req, res) => {

  schoolController.findAllWhere({})
    .then(r => res.status(r.status).json(r))
    .catch(e => res.status(e.status).json(e))
})

SchoolRouter.get('/:id', (req, res) => {

  schoolController.findOneById(req.params.id, req)
    .then(r => res.status(r.status).json(r))
    .catch(e => res.status(e.status).json(e))
})

SchoolRouter.post('/', (req, res) => {

  schoolController.save(req.body, {})
    .then(r => res.status(r.status).json(r))
    .catch(e => res.status(e.status).json(e))
});

SchoolRouter.put('/:id', (req, res) => {

  schoolController.updateId(req.params.id, req.body)
    .then(r => res.status(r.status).json(r))
    .catch(e => res.status(e.status).json(e))
});

SchoolRouter.delete('/:id', (req, res) => {

  schoolController.deleteId(req.params.id)
    .then(r => res.status(r.status).json(r))
    .catch(e => res.status(e.status).json(e))
});

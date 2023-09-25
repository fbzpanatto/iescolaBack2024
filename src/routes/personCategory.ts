import { Router } from "express";
import { personCategoryController } from "../controller/personCategory";

export const PersonCategoryRouter = Router();

PersonCategoryRouter.get('/', (req, res) => {

  personCategoryController.findAllWhere({})
    .then(r => res.status(r.status).json(r))
    .catch(e => res.status(e.status).json(e))
})

PersonCategoryRouter.get('/:id', (req, res) => {

  personCategoryController.findOneById(req.params.id)
    .then(r => res.status(r.status).json(r))
    .catch(e => res.status(e.status).json(e))
})

PersonCategoryRouter.post('/', (req, res) => {

  personCategoryController.save(req.body, {})
    .then(r => res.status(r.status).json(r))
    .catch(e => res.status(e.status).json(e))
});

PersonCategoryRouter.put('/:id', (req, res) => {

  personCategoryController.updateId(req.params.id, req.body)
    .then(r => res.status(r.status).json(r))
    .catch(e => res.status(e.status).json(e))
});

PersonCategoryRouter.delete('/:id', (req, res) => {

  personCategoryController.deleteId(req.params.id)
    .then(r => res.status(r.status).json(r))
    .catch(e => res.status(e.status).json(e))
});

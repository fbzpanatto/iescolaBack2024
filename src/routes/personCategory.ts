import { Router } from "express";
import { personCategoryController } from "../controller/personCategory";
import havePermission from "../middleware/havePermission";

export const PersonCategoryRouter = Router();

PersonCategoryRouter.get('/', havePermission, (req, res) => {

  personCategoryController.findAllWhere({}, req)
    .then(r => res.status(r.status).json(r))
    .catch(e => res.status(e.status).json(e))
})

PersonCategoryRouter.get('/:id', havePermission, (req, res) => {

  personCategoryController.findOneById(req.params.id, req)
    .then(r => res.status(r.status).json(r))
    .catch(e => res.status(e.status).json(e))
})

PersonCategoryRouter.post('/', havePermission, (req, res) => {

  personCategoryController.save(req.body, {})
    .then(r => res.status(r.status).json(r))
    .catch(e => res.status(e.status).json(e))
});

PersonCategoryRouter.put('/:id', havePermission, (req, res) => {

  personCategoryController.updateId(req.params.id, req.body)
    .then(r => res.status(r.status).json(r))
    .catch(e => res.status(e.status).json(e))
});

PersonCategoryRouter.delete('/:id', havePermission, (req, res) => {

  personCategoryController.deleteId(req.params.id)
    .then(r => res.status(r.status).json(r))
    .catch(e => res.status(e.status).json(e))
});

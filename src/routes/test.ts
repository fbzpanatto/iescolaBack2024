import { Router } from "express";
import { testController } from "../controller/test";
import havePermission from "../middleware/havePermission";

export const TestRouter = Router();

TestRouter.get('/', havePermission, (req, res) => {

  testController.findAllWhere({}, req)
    .then(r => res.status(r.status).json(r))
    .catch(e => res.status(e.status).json(e))
})

TestRouter.get('/:id', havePermission, (req, res) => {

  testController.findOneById(req.params.id)
    .then(r => res.status(r.status).json(r))
    .catch(e => res.status(e.status).json(e))
})

TestRouter.post('/', havePermission, (req, res) => {

  testController.save(req.body, {})
    .then(r => res.status(r.status).json(r))
    .catch(e => res.status(e.status).json(e))
});

TestRouter.put('/:id', havePermission, (req, res) => {

  testController.updateId(req.params.id, req.body)
    .then(r => res.status(r.status).json(r))
    .catch(e => res.status(e.status).json(e))
});

TestRouter.delete('/:id', havePermission, (req, res) => {

  testController.deleteId(req)
    .then(r => res.status(r.status).json(r))
    .catch(e => res.status(e.status).json(e))
});

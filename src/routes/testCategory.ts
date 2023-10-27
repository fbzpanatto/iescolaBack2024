import { Router } from "express";
import { testCategoryController } from "../controller/testCategory";

export const TestCategoryRouter = Router();

TestCategoryRouter.get('/', (req, res) => {

  testCategoryController.findAllWhere({})
    .then(r => res.status(r.status).json(r))
    .catch(e => res.status(e.status).json(e))
})

TestCategoryRouter.get('/:id', (req, res) => {

  testCategoryController.findOneById(req.params.id, req)
    .then(r => res.status(r.status).json(r))
    .catch(e => res.status(e.status).json(e))
})

TestCategoryRouter.post('/', (req, res) => {

  testCategoryController.save(req.body, {})
    .then(r => res.status(r.status).json(r))
    .catch(e => res.status(e.status).json(e))
});

TestCategoryRouter.put('/:id', (req, res) => {

  testCategoryController.updateId(req.params.id, req.body)
    .then(r => res.status(r.status).json(r))
    .catch(e => res.status(e.status).json(e))
});

TestCategoryRouter.delete('/:id', (req, res) => {

  testCategoryController.deleteId(req.params.id)
    .then(r => res.status(r.status).json(r))
    .catch(e => res.status(e.status).json(e))
});

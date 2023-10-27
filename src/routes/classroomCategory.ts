import { Router } from "express";
import { classroomCategoryController } from "../controller/classroomCategory";

export const CassroomCategoryRouter = Router();

CassroomCategoryRouter.get('/', (req, res) => {

  classroomCategoryController.findAllWhere({})
    .then(r => res.status(r.status).json(r))
    .catch(e => res.status(e.status).json(e))
})

CassroomCategoryRouter.get('/:id', (req, res) => {

  classroomCategoryController.findOneById(req.params.id, req)
    .then(r => res.status(r.status).json(r))
    .catch(e => res.status(e.status).json(e))
})

CassroomCategoryRouter.post('/', (req, res) => {

  classroomCategoryController.save(req.body, {})
    .then(r => res.status(r.status).json(r))
    .catch(e => res.status(e.status).json(e))
});

CassroomCategoryRouter.put('/:id', (req, res) => {

  classroomCategoryController.updateId(req.params.id, req.body)
    .then(r => res.status(r.status).json(r))
    .catch(e => res.status(e.status).json(e))
});

CassroomCategoryRouter.delete('/:id', (req, res) => {

  classroomCategoryController.deleteId(req.params.id)
    .then(r => res.status(r.status).json(r))
    .catch(e => res.status(e.status).json(e))
});

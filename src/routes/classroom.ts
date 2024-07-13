import { Router } from "express";
import { classroomController } from "../controller/classroom";

export const ClassroomRouter = Router();

ClassroomRouter.get('/', async (req, res) => {

  const response = await classroomController.getAllClassrooms(req)
  return res.status(response.status).json(response)
})

ClassroomRouter.get('/:id', (req, res) => {

  classroomController.findOneById(req.params.id, req)
    .then(r => res.status(r.status).json(r))
    .catch(e => res.status(e.status).json(e))
})

ClassroomRouter.post('/', (req, res) => {

  classroomController.save(req.body, {})
    .then(r => res.status(r.status).json(r))
    .catch(e => res.status(e.status).json(e))
});

ClassroomRouter.put('/:id', (req, res) => {

  classroomController.updateId(req.params.id, req.body)
    .then(r => res.status(r.status).json(r))
    .catch(e => res.status(e.status).json(e))
});

ClassroomRouter.delete('/:id', (req, res) => {

  classroomController.deleteId(req.params.id)
    .then(r => res.status(r.status).json(r))
    .catch(e => res.status(e.status).json(e))
});

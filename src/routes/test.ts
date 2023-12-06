import { Router } from "express";
import { testController } from "../controller/test";
import havePermission from "../middleware/havePermission";

export const TestRouter = Router();

TestRouter.get('/:year/all', havePermission, (req, res) => {

  testController.findAllWhere({}, req)
    .then(r => res.status(r.status).json(r))
    .catch(e => res.status(e.status).json(e))
})

TestRouter.get('/:id/classroom/:classroom', havePermission, (req, res) => {

  testController.getAllClassroomStudents({}, req)
    .then(r => res.status(r.status).json(r))
    .catch(e => res.status(e.status).json(e))
})

TestRouter.get('/:id/classroom/:classroom/graphic', havePermission, (req, res) => {

  testController.getGraphic(req)
    .then(r => res.status(r.status).json(r))
    .catch(e => res.status(e.status).json(e))
})

TestRouter.get('/:id/classroom/:classroom/include', havePermission, (req, res) => {

  testController.getAllToInsert(req)
    .then(r => res.status(r.status).json(r))
    .catch(e => res.status(e.status).json(e))
})

TestRouter.post('/:id/classroom/:classroom/include', havePermission, (req, res) => {

  testController.insertStudents(req.body)
    .then(r => res.status(r.status).json(r))
    .catch(e => res.status(e.status).json(e))
})

TestRouter.get('/:id', havePermission, (req, res) => {

  testController.findOneById(req.params.id, req.body)
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

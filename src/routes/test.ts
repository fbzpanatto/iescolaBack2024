import { Router, Request, Response } from "express";
import { testController } from "../controller/test";
import { VALIDATE_TEST, BODY_VALIDATION_TEST, VALIDATE_ID } from "../middleware/validators";
import havePermission from "../middleware/havePermission";

const CREATE_VALIDATORS = [VALIDATE_TEST, BODY_VALIDATION_TEST]
const UPDATE_VALIDATORS = [VALIDATE_ID, VALIDATE_TEST, BODY_VALIDATION_TEST]

export const TestRouter = Router();

TestRouter.get('/form', havePermission, (req, res) => {

  testController.getFormData()
    .then(r => res.status(r.status).json(r))
    .catch(e => res.status(e.status).json(e))
})

TestRouter.get('/:year/all', havePermission, (req, res) => {

  testController.findAllWhere({}, req)
    .then(r => res.status(r.status).json(r))
    .catch(e => res.status(e.status).json(e))
})

TestRouter.get('/:id/:year/:classroom', havePermission, (req, res) => {

  testController.getAllClassroomStudents({}, req)
    .then(r => res.status(r.status).json(r))
    .catch(e => res.status(e.status).json(e))
})

TestRouter.get('/:id/classroom/:classroom/graphic', havePermission, (req, res) => {

  testController.getGraphic(req)
    .then(r => res.status(r.status).json(r))
    .catch(e => res.status(e.status).json(e))
})

TestRouter.get('/:id/:year/:classroom/include', havePermission, (req, res) => {

  testController.getAllToInsert(req)
    .then(r => res.status(r.status).json(r))
    .catch(e => res.status(e.status).json(e))
})

TestRouter.post('/:id/:classroom/include', havePermission, (req, res) => {

  testController.insertStudents(req.body)
    .then(r => res.status(r.status).json(r))
    .catch(e => res.status(e.status).json(e))
})

TestRouter.get('/:id', havePermission, (req, res) => {

  testController.findOneById(req.params.id, req)
    .then(r => res.status(r.status).json(r))
    .catch(e => res.status(e.status).json(e))
})

TestRouter.post('/', ...CREATE_VALIDATORS, havePermission, (req: Request, res: Response) => {

  testController.save(req.body, {})
    .then(r => res.status(r.status).json(r))
    .catch(e => res.status(e.status).json(e))
});

TestRouter.put('/:id', ...UPDATE_VALIDATORS, havePermission, (req: Request, res: Response) => {

  testController.updateId(req.params.id, req)
    .then(r => res.status(r.status).json(r))
    .catch(e => res.status(e.status).json(e))
});

TestRouter.delete('/:id', havePermission, (req, res) => {

  testController.deleteId(req)
    .then(r => res.status(r.status).json(r))
    .catch(e => res.status(e.status).json(e))
});

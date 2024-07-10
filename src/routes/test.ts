import { Router, Request, Response } from "express";
import { testController } from "../controller/test";
import { VALIDATE_TEST, BODY_VALIDATION_TEST, VALIDATE_ID } from "../middleware/validators";
import havePermission from "../middleware/havePermission";

const CREATE_VALIDATORS = [VALIDATE_TEST, BODY_VALIDATION_TEST]
const UPDATE_VALIDATORS = [VALIDATE_ID, VALIDATE_TEST, BODY_VALIDATION_TEST]

export const TestRouter = Router();

TestRouter.get('/form', havePermission, (req, res) => {

  testController.getFormData(req)
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

TestRouter.post('/', ...CREATE_VALIDATORS, havePermission, async (req: Request, res: Response) => {
  const response = await testController.saveTest(req.body)
  return res.status(response.status).json(response)
});

TestRouter.put('/:id', ...UPDATE_VALIDATORS, havePermission, async (req: Request, res: Response) => {
  const response = await testController.updateTestById(req.params.id, req)
  return res.status(response?.status as number).json(response)
});

TestRouter.delete('/:id', havePermission, (req, res) => {

  testController.deleteId(req)
    .then(r => res.status(r.status).json(r))
    .catch(e => res.status(e.status).json(e))
});

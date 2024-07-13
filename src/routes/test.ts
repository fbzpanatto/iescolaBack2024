import { Router, Request, Response } from "express";
import { testController as controller } from "../controller/test";
import { VALIDATE_TEST, BODY_VALIDATION_TEST, PARAM_ID, PARAM_CLASSID, PARAM_YEAR } from "../middleware/validators";
import havePermission from "../middleware/havePermission";

const CHECK_ID_CLASS = [PARAM_ID, PARAM_CLASSID]
const CHECK_PARAMS = [PARAM_ID, PARAM_YEAR, PARAM_CLASSID]
const CREATE_VALIDATORS = [VALIDATE_TEST, BODY_VALIDATION_TEST]
const UPDATE_VALIDATORS = [PARAM_ID, VALIDATE_TEST, BODY_VALIDATION_TEST]

export const TestRouter = Router();

TestRouter.get('/form', havePermission, async (req, res) => {
  const response = await controller.getFormData(req); return res.status(response.status).json(response)
})

TestRouter.get('/:year/all', PARAM_YEAR, havePermission, async (req, res) => {
  const response = await controller.findAllByYear(req); return res.status(response.status).json(response)
})

TestRouter.get('/:id/:year/:classroom', ...CHECK_PARAMS, havePermission, async (req, res) => {
  const response = await controller.getStudents(req); return res.status(response.status).json(response)
})

TestRouter.get('/:id/classroom/:classroom/graphic', ...CHECK_ID_CLASS, havePermission, async (req, res) => {
  const response = await controller.getGraphic(req); return res.status(response.status).json(response)
})

TestRouter.get('/:id/:year/:classroom/include', ...CHECK_PARAMS, havePermission, async (req, res) => {
  const response = await controller.getAllToInsert(req); return res.status(response.status).json(response)
})

TestRouter.get('/:id', PARAM_ID, havePermission, async (req, res) => {
  const response = await controller.getById(req); return res.status(response.status).json(response)
})

TestRouter.post('/:id/:classroom/include', ...CHECK_ID_CLASS, havePermission, async (req, res) => {
  const response = await controller.insertStudents(req); return res.status(response.status).json(response)
})

TestRouter.post('/', ...CREATE_VALIDATORS, havePermission, async (req: Request, res: Response) => {
  const response = await controller.saveTest(req.body); return res.status(response.status).json(response)
});

TestRouter.put('/:id', ...UPDATE_VALIDATORS, havePermission, async (req: Request, res: Response) => {
  const response = await controller.updateTest(req.params.id, req); return res.status(response.status as number).json(response)
});
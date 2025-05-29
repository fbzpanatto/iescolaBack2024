import { Router, Request } from "express"
import { testController as controller } from "../controller/test"
import { VALIDATE_TEST, BODY_VALIDATION_TEST, ID_PARAM, CLASSROOM_ID_PARAM, YEAR_NAME_PARAM, STUDENT_CLASSROOM_ID } from "../middleware/validators";
import havePermission from "../middleware/havePermission";

const CHECK_ID_CLASS = [ID_PARAM, CLASSROOM_ID_PARAM]
const CHECK_PARAMS = [ID_PARAM, YEAR_NAME_PARAM, CLASSROOM_ID_PARAM]
const UPDATE_VALIDATORS = [ID_PARAM, VALIDATE_TEST, BODY_VALIDATION_TEST]

export const TestRouter = Router();

TestRouter.get('/form', havePermission, async (req: Request, res: any) => {
  const response = await controller.getFormData(req); return res.status(response.status).json(response)
});

TestRouter.get('/:year/all', YEAR_NAME_PARAM, havePermission, async (req: Request, res: any) => {
  const response = await controller.findAllByYear(req); return res.status(response.status).json(response)
});

TestRouter.get('/:id/:year/:classroom', ...CHECK_PARAMS, havePermission, async (req: Request, res: any) => {
  const response = await controller.getStudents(req); return res.status(response.status).json(response)
});

TestRouter.get('/:id/classroom/:classroom/graphic', ...CHECK_ID_CLASS, havePermission, async (req: Request, res: any) => {
  const response = await controller.getGraphic(req); return res.status(response.status).json(response)
});

TestRouter.get('/:id/:year/:classroom/include', ...CHECK_PARAMS, havePermission, async (req: Request, res: any) => {
  const response = await controller.getAllToInsert(req); return res.status(response.status).json(response)
});

TestRouter.get('/:id', ID_PARAM, havePermission, async (req: Request, res: any) => {
  const response = await controller.getById(req); return res.status(response.status).json(response)
});

TestRouter.post('/:id/:classroom/include', ...CHECK_ID_CLASS, havePermission, async (req: Request, res: any) => {
  const response = await controller.insertStudents(req); return res.status(response.status).json(response)
});

TestRouter.delete('/:id/:classroom/delete/:studentClassroomId', [...CHECK_ID_CLASS, STUDENT_CLASSROOM_ID], havePermission, async (req: Request, res: any) => {
  const response = await controller.deleteStudentFromTest(req); return res.status(response.status).json(response)
});

TestRouter.post('/', havePermission, async (req: Request, res: any) => {
  const response = await controller.saveTest(req.body); return res.status(response.status).json(response)
});

TestRouter.put('/:id', ...UPDATE_VALIDATORS, havePermission, async (req: Request, res: any) => {
  const response = await controller.updateTest(req.params.id, req); return res.status(response.status as number).json(response)
});
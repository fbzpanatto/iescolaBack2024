import { Router, Request, Response } from "express"
import { testController as controller } from "../controller/test"
import { VALIDATE_TEST, BODY_VALIDATION_TEST, ID_PARAM, CLASSROOM_ID_PARAM, YEAR_NAME_PARAM } from "../middleware/validators";
import havePermission from "../middleware/havePermission";
import { testUpdateController } from "../controller/testUpdate";
import { testCreateController } from "../controller/testCreate";
import { testGraphicController } from "../controller/testGraphic";
import { testQueryController } from "../controller/testQuery";
import { sendResponse } from "../utils/sendResponse";

const CHECK_ID_CLASS = [ID_PARAM, CLASSROOM_ID_PARAM]
const CHECK_PARAMS = [ID_PARAM, YEAR_NAME_PARAM, CLASSROOM_ID_PARAM]
const UPDATE_VALIDATORS = [ID_PARAM, VALIDATE_TEST, BODY_VALIDATION_TEST]

export const TestRouter = Router();

TestRouter.get('/form', havePermission, async (req: Request, res: Response) => {
  const response = await controller.getFormData(req, req.user); return sendResponse(res, response)
});

TestRouter.get('/form/test-category/:testCategory', havePermission, async (req: Request, res: Response) => {
  const response = await controller.getFormDataByTestCategory(req, req.user); return sendResponse(res, response)
});

TestRouter.get('/:year/all', YEAR_NAME_PARAM, havePermission, async (req: Request<{ year: string }>, res: Response) => {
  const response = await testQueryController.findAllByYear(req, req.user); return sendResponse(res, response)
});

TestRouter.get('/:id/preview', ID_PARAM, havePermission, async (req: Request<{ id: string }>, res: Response): Promise<void> => {
  const response = await testQueryController.getPreview(req, req.user); sendResponse(res, response)
});

TestRouter.get('/:id/:year/:classroom', ...CHECK_PARAMS, havePermission, async (req: Request, res: Response) => {
  const response = await controller.getStudents(req, req.user); return sendResponse(res, response)
});

TestRouter.get('/:id/classroom/:classroom/graphic', ...CHECK_ID_CLASS, havePermission, async (req: Request<{ id: string, classroom: string }>, res: Response) => {
  const response = await testGraphicController.getGraphic(req, req.user); return sendResponse(res, response)
});

TestRouter.get('/:id/classroom/:classroom/grouped', ...CHECK_ID_CLASS, havePermission, async (req: Request, res: Response) => {
  const response = await testGraphicController.getGroupedFullParallel(req, req.user); return sendResponse(res, response)
});

TestRouter.get('/:id', ID_PARAM, havePermission, async (req: Request<{ id: string }>, res: Response) => {
  const response = await testQueryController.getById(req, req.user); return sendResponse(res, response)
});

TestRouter.post('/', havePermission, async (req: Request, res: Response) => {
  const response = await testCreateController.saveTest(req.body, req.user); return sendResponse(res, response)
});

TestRouter.put('/:id', ...UPDATE_VALIDATORS, havePermission, async (req: Request<{ id: string }>, res: Response) => {
  const response = await testUpdateController.updateTest(req.params.id, req, req.user); return sendResponse(res, response)
});


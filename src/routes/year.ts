import { Router, Request, Response } from 'express'
import { yearController as controller } from "../controller/year";
import { ID_PARAM, VALIDATE_YEAR, BODY_VALIDATION_YEAR } from "../middleware/validators";
import havePermission from "../middleware/havePermission";
import { sendResponse } from "../utils/sendResponse";

const CREATE_VALIDATORS = [VALIDATE_YEAR, BODY_VALIDATION_YEAR]
const UPDATE_VALIDATORS = [ID_PARAM, VALIDATE_YEAR, BODY_VALIDATION_YEAR]

export const YearRouter = Router();

YearRouter.get('/', havePermission, async (req: Request, res: Response) => {
  const response = await controller.findAllWhere({}, req); return sendResponse(res, response)
})

YearRouter.get('/:id', ID_PARAM, havePermission, async (req: Request<{ id: string }>, res: Response) => {
  const response = await controller.findOneById(req.params.id, req.body); return sendResponse(res, response)
})

YearRouter.post('/', ...CREATE_VALIDATORS, havePermission, async (req: Request, res: Response) => {
  const response = await controller.saveWithAuth(req.body, req.user); return sendResponse(res, response)
})

YearRouter.put('/:id', ...UPDATE_VALIDATORS, havePermission, async (req: Request, res: Response) => {
  const response = await controller.updateIdWithAuth(req.params.id, req.body, req.user); return sendResponse(res, response)
})
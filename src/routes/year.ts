import { Router, Request, Response } from 'express'
import { yearController as controller } from "../controller/year";
import { ID_PARAM, VALIDATE_YEAR, BODY_VALIDATION_YEAR } from "../middleware/validators";
import havePermission from "../middleware/havePermission";

const CREATE_VALIDATORS = [VALIDATE_YEAR, BODY_VALIDATION_YEAR]
const UPDATE_VALIDATORS = [ID_PARAM, VALIDATE_YEAR, BODY_VALIDATION_YEAR]

export const YearRouter = Router();

YearRouter.get('/', havePermission, async (req: Request, res: Response) => {
  const response = await controller.findAllWhere({}, req); return res.status(response.status).json(response)
})

YearRouter.get('/:id', ID_PARAM, havePermission, async (req: Request, res: Response) => {
  const response = await controller.findOneById(req.params.id, req.body); return res.status(response.status).json(response)
})

YearRouter.post('/', ...CREATE_VALIDATORS, havePermission, async (req: Request, res: Response) => {
  const response = await controller.save(req.body); return res.status(response.status).json(response)
})

YearRouter.put('/:id', ...UPDATE_VALIDATORS, havePermission, async (req: Request, res: Response) => {
  const response = await controller.updateId(req.params.id, req.body); return res.status(response.status).json(response)
})
import { Router, Request, Response } from "express";
import { disabilityController as controller } from "../controller/disability";
import {ID_PARAM} from "../middleware/validators";
import { sendResponse } from "../utils/sendResponse";

export const DisabilityRouter = Router();

DisabilityRouter.get('/', async (req: Request, res: Response ) => { const response = await controller.findAllWhere({}); return sendResponse(res, response)})

DisabilityRouter.get('/:id', ID_PARAM, async (req: Request<{ id: string }>, res: Response ) => { const response = await controller.findOneById(req.params.id, req); return sendResponse(res, response)})

DisabilityRouter.post('/', async (req: Request, res: Response ) => { const response = await controller.save(req.body, {}); return sendResponse(res, response)})

DisabilityRouter.put('/:id', ID_PARAM, async (req: Request<{ id: string }>, res: Response ) => { const response = await controller.updateId(req.params.id, req.body); return sendResponse(res, response)})
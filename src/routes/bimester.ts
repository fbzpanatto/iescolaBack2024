import { Router, Request, Response } from "express";
import { bimesterController as controller } from "../controller/bimester";
import { ID_PARAM } from "../middleware/validators";
import { sendResponse } from "../utils/sendResponse";

export const BimesterRouter = Router();

BimesterRouter.get('/', async(req: Request, res: Response) => { const response = await controller.findAllWhere(); return sendResponse(res, response)})

BimesterRouter.get('/:id', ID_PARAM, async(req: Request<{ id: string }>, res: Response) => { const response = await controller.findOneById(req.params.id, req); return sendResponse(res, response)})

BimesterRouter.post('/', async(req: Request, res: Response) => { const response = await controller.save(req.body, {}); return sendResponse(res, response)})

BimesterRouter.put('/:id', ID_PARAM, async (req: Request<{ id: string }>, res: Response) => { const response = await controller.updateId(req.params.id, req.body); return sendResponse(res, response)})
import { Router, Request, Response } from "express";
import { personController as controller } from "../controller/person";
import {ID_PARAM} from "../middleware/validators";
import { sendResponse } from "../utils/sendResponse";

export const PersonRouter = Router();

PersonRouter.get('/', async (req: Request, res: Response) => { const response = await controller.findAllWhere({}); return sendResponse(res, response)})

PersonRouter.get('/:id', ID_PARAM, async (req: Request<{ id: string }>, res: Response) => { const response = await controller.findOneById(req.params.id, req); return sendResponse(res, response) })

PersonRouter.post('/', async (req: Request, res: Response) => { const response = await controller.save(req.body, {}); return sendResponse(res, response) });

PersonRouter.put('/:id', ID_PARAM, async (req: Request<{ id: string }>, res: Response) => { const response = await controller.updateId(req.params.id, req.body); return sendResponse(res, response) });

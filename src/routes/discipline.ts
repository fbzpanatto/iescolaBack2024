import { Router, Request, Response } from "express";
import { discController as controller } from "../controller/discipline";
import {ID_PARAM} from "../middleware/validators";
import { sendResponse } from "../utils/sendResponse";

export const DisciplineRouter = Router();

DisciplineRouter.get('/', async (req: Request, res: Response) => { const response = await controller.getAllDisciplines(req, req.user); return sendResponse(res, response)})

DisciplineRouter.get('/:id', ID_PARAM, async (req: Request<{ id: string }>, res: Response) => { const response = await controller.findOneById(req.params?.id, req); return sendResponse(res, response)})

DisciplineRouter.post('/', async (req: Request, res: Response) => { const response = await controller.save(req.body, {}); return sendResponse(res, response)})

DisciplineRouter.put('/:id', ID_PARAM, async (req: Request<{ id: string }>, res: Response) => { const response = await controller.updateId(req.params?.id, req.body); return sendResponse(res, response)})
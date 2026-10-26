import { Router, Request, Response } from "express";
import { classCatController as controller } from "../controller/classroomCategory";
import { ID_PARAM } from "../middleware/validators";
import { sendResponse } from "../utils/sendResponse";

export const ClassroomCategoryRouter = Router();

ClassroomCategoryRouter.get('/', async (req: Request, res: Response) => { const response = await controller.findAllWhere({}); return sendResponse(res, response)})

ClassroomCategoryRouter.get('/:id', ID_PARAM, async (req: Request<{ id: string }>, res: Response) => { const response = await controller.findOneById(req.params.id, req); return sendResponse(res, response)})

ClassroomCategoryRouter.post('/', async (req: Request, res: Response) => { const response = await controller.save(req.body, {}); return sendResponse(res, response)})

ClassroomCategoryRouter.put('/:id', ID_PARAM, async (req: Request<{ id: string }>, res: Response) => { const response = await controller.updateId(req.params.id, req.body); return sendResponse(res, response)})

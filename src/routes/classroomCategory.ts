import { Router, Request, Response } from "express";
import { classCatController as controller } from "../controller/classroomCategory";
import { ID_PARAM } from "../middleware/validators";

export const ClassroomCategoryRouter = Router();

ClassroomCategoryRouter.get('/', async (req: Request, res: Response) => { const response = await controller.findAllWhere({}); return res.status(response.status).json(response)})

ClassroomCategoryRouter.get('/:id', ID_PARAM, async (req: Request<{ id: string }>, res: Response) => { const response = await controller.findOneById(req.params.id, req); return res.status(response.status).json(response)})

ClassroomCategoryRouter.post('/', async (req: Request, res: Response) => { const response = await controller.save(req.body, {}); return res.status(response.status).json(response)})

ClassroomCategoryRouter.put('/:id', ID_PARAM, async (req: Request<{ id: string }>, res: Response) => { const response = await controller.updateId(req.params.id, req.body); return res.status(response.status).json(response)})

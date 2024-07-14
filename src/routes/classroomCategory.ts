import { Router, Request, Response } from "express";
import { classCatController as controller } from "../controller/classroomCategory";
import { ID_PARAM } from "../middleware/validators";

export const CassroomCategoryRouter = Router();

CassroomCategoryRouter.get('/', async (req: Request, res: Response) => { const response = await controller.findAllWhere({}); return res.status(response.status).json(response)})

CassroomCategoryRouter.get('/:id', ID_PARAM, async (req: Request, res: Response) => { const response = await controller.findOneById(req.params.id, req); return res.status(response.status).json(response)})

CassroomCategoryRouter.post('/', async (req: Request, res: Response) => { const response = await controller.save(req.body, {}); return res.status(response.status).json(response)})

CassroomCategoryRouter.put('/:id', ID_PARAM, async (req: Request, res: Response) => { const response = await controller.updateId(req.params.id, req.body); return res.status(response.status).json(response)})

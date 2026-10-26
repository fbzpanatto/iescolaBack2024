import { Router, Request, Response } from "express";
import { discController as controller } from "../controller/discipline";
import {ID_PARAM} from "../middleware/validators";

export const DisciplineRouter = Router();

DisciplineRouter.get('/', async (req: Request, res: Response) => { const response = await controller.getAllDisciplines(req, req.user); return res.status(response.status).json(response)})

DisciplineRouter.get('/:id', ID_PARAM, async (req: Request<{ id: string }>, res: Response) => { const response = await controller.findOneById(req.params?.id, req); return res.status(response.status).json(response)})

DisciplineRouter.post('/', async (req: Request, res: Response) => { const response = await controller.save(req.body, {}); return res.status(response.status).json(response)})

DisciplineRouter.put('/:id', ID_PARAM, async (req: Request<{ id: string }>, res: Response) => { const response = await controller.updateId(req.params?.id, req.body); return res.status(response.status).json(response)})
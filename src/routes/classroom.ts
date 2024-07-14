import { Router, Request, Response } from "express";
import { classroomController as controller } from "../controller/classroom";
import {ID_PARAM} from "../middleware/validators";

export const ClassroomRouter = Router();

ClassroomRouter.get('/', async (req: Request, res: Response) => { const response = await controller.getAllClassrooms(req); return res.status(response.status).json(response)})

ClassroomRouter.get('/:id', ID_PARAM, async (req: Request, res: Response) => { const response = await controller.findOneById(req.params.id, req); return res.status(response.status).json(response)})

ClassroomRouter.post('/', async (req: Request, res: Response) => { const response = await controller.save(req.body, {}); return res.status(response.status).json(response)})

ClassroomRouter.put('/:id', ID_PARAM, async (req: Request, res: Response) => { const response = await controller.updateId(req.params.id, req.body); return res.status(response.status).json(response)})
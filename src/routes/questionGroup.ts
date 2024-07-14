import { Router, Request, Response } from "express";
import { Data } from "../interfaces/interfaces"
import { qGroupCtrl as controller } from "../controller/questionGroup";
import {ID_PARAM} from "../middleware/validators";

export const QGroupR = Router();

QGroupR.get('/', async (req: Request, res: Response) => { const data: Data = await controller.findAllWhere({}); return res.status(data.status).json(data)})
QGroupR.get('/:id', ID_PARAM, async (req: Request, res: Response) => { const data: Data = await controller.findOneById(req.params.id, req); return res.status(data.status).json(data) })
QGroupR.post('/', async (req: Request, res: Response) => { const data: Data = await controller.save(req.body, {}); return res.status(data.status).json(data) })
QGroupR.put('/:id', ID_PARAM, async (req: Request, res: Response) => { const data: Data = await controller.updateId(req.params.id, req.body); return res.status(data.status).json(data) })
import { Router, Request, Response } from "express";
import { Data } from "../interfaces/interfaces"
import { qGroupCtrl } from "../controller/questionGroup";

export const QGroupR = Router();

QGroupR.get('/', async (req: Request, res: Response) => { const data: Data = await qGroupCtrl.findAllWhere({}); return res.status(data.status).json(data)})
QGroupR.get('/:id', async (req: Request, res: Response) => { const data: Data = await qGroupCtrl.findOneById(req.params.id, req); return res.status(data.status).json(data) })
QGroupR.post('/', async (req: Request, res: Response) => { const data: Data = await qGroupCtrl.save(req.body, {}); return res.status(data.status).json(data) })
QGroupR.put('/:id', async (req: Request, res: Response) => { const data: Data = await qGroupCtrl.updateId(req.params.id, req.body); return res.status(data.status).json(data) })
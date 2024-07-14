import { Router, Request, Response } from "express";
import { Data } from "../interfaces/interfaces"
import { quesCtrl } from "../controller/question";

export const QuesR = Router();

QuesR.get('/form', async (req: Request, res: Response) => { const data: Data = await quesCtrl.questionForm(req); return res.status(data.status).json(data) })
QuesR.get('/owner/:id', async (req: Request, res: Response) => { const data: Data = await quesCtrl.isOwner(req); return res.status(data.status).json(data) })
QuesR.get('/', async (req: Request, res: Response) => { const data: Data = await quesCtrl.allQuestions(req); return res.status(data.status).json(data) })
QuesR.get('/:id', async (req: Request, res: Response) => { const data: Data = await quesCtrl.findOneById(req.params.id, req); return res.status(data.status).json(data) })
QuesR.post('/', async (req: Request, res: Response) => { const data: Data = await quesCtrl.save(req.body, {}); return res.status(data.status).json(data) })
QuesR.put('/:id', async (req: Request, res: Response) => { const data: Data = await quesCtrl.updateId(req.params.id, req.body); return res.status(data.status).json(data) })

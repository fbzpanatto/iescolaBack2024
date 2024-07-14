import { Router, Request, Response } from "express";
import { Data } from "../interfaces/interfaces"
import { quesCtrl as controller } from "../controller/question";
import {ID_PARAM} from "../middleware/validators";

export const QuesR = Router();

QuesR.get('/form', async (req: Request, res: Response) => { const data: Data = await controller.questionForm(req); return res.status(data.status).json(data) })
QuesR.get('/owner/:id', ID_PARAM, async (req: Request, res: Response) => { const data: Data = await controller.isOwner(req); return res.status(data.status).json(data) })
QuesR.get('/', async (req: Request, res: Response) => { const data: Data = await controller.allQuestions(req); return res.status(data.status).json(data) })
QuesR.get('/:id', ID_PARAM, async (req: Request, res: Response) => { const data: Data = await controller.findOneById(req.params.id, req); return res.status(data.status).json(data) })
QuesR.post('/', async (req: Request, res: Response) => { const data: Data = await controller.save(req.body, {}); return res.status(data.status).json(data) })
QuesR.put('/:id', ID_PARAM, async (req: Request, res: Response) => { const data: Data = await controller.updateId(req.params.id, req.body); return res.status(data.status).json(data) })

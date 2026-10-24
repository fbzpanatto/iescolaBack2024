import { Router, Request } from "express";
import { Data } from "../interfaces/interfaces"
import { quesCtrl as controller } from "../controller/question";
import {ID_PARAM} from "../middleware/validators";
import havePermission from "../middleware/havePermission";

export const QuesR = Router();

QuesR.get('/form', havePermission, async (req: Request, res: any) => { const data: Data = await controller.questionForm(req); return res.status(data.status).json(data) })
QuesR.get('/owner/:id', ID_PARAM, havePermission, async (req: Request, res: any) => { const data: Data = await controller.isOwner(req, (req as any).user); return res.status(data.status).json(data) })
QuesR.get('/', havePermission, async (req: Request, res: any) => { const data: Data = await controller.allQuestions(req); return res.status(data.status).json(data) })
QuesR.get('/:id', ID_PARAM, havePermission, async (req: Request<{ id: number | string }>, res: any) => { const data: Data = await controller.findOneById(req.params.id, req); return res.status(data.status).json(data) })
QuesR.post('/', havePermission, async (req: Request, res: any) => { const data: Data = await controller.save(req.body, {}); return res.status(data.status).json(data) })
QuesR.put('/:id', ID_PARAM, havePermission, async (req: Request<{ id: number | string }>, res: any) => { const data: Data = await controller.updateId(req.params.id, req.body); return res.status(data.status).json(data) })

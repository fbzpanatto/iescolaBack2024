import { Router, Request, Response } from "express";
import { Data } from "../interfaces/interfaces"
import { quesCtrl as controller } from "../controller/question";
import {ID_PARAM} from "../middleware/validators";
import havePermission from "../middleware/havePermission";
import { sendResponse } from "../utils/sendResponse";

export const QuesR = Router();

QuesR.get('/form', havePermission, async (req: Request, res: Response) => { const data: Data = await controller.questionForm(req); return sendResponse(res, data) })
QuesR.get('/owner/:id', ID_PARAM, havePermission, async (req: Request, res: Response) => { const data: Data = await controller.isOwner(req, req.user); return sendResponse(res, data) })
QuesR.get('/', havePermission, async (req: Request, res: Response) => { const data: Data = await controller.allQuestions(req); return sendResponse(res, data) })
QuesR.get('/:id', ID_PARAM, havePermission, async (req: Request<{ id: string }>, res: Response) => { const data: Data = await controller.findOneById(req.params.id, req); return sendResponse(res, data) })
QuesR.post('/', havePermission, async (req: Request, res: Response) => { const data: Data = await controller.save(req.body, {}); return sendResponse(res, data) })
QuesR.put('/:id', ID_PARAM, havePermission, async (req: Request<{ id: string }>, res: Response) => { const data: Data = await controller.updateId(req.params.id, req.body); return sendResponse(res, data) })

import { Router, Request, Response } from "express";
import { pCatCtrl as controller } from "../controller/personCategory";
import havePerm from "../middleware/havePermission";
import {ID_PARAM} from "../middleware/validators";

export const PeCatRouter = Router();

PeCatRouter.get('/', havePerm, async (req: Request, res: Response) => { const response = await controller.findAllPerCat(req); return res.status(response.status as number).json(response)})

PeCatRouter.get('/:id', ID_PARAM, havePerm, async (req: Request, res: Response) => { const response = await controller.findOneById(req.params.id, req); return res.status(response.status as number).json(response) })

PeCatRouter.post('/', havePerm, async (req: Request, res: Response) => { const response = await controller.save(req.body, {}); return res.status(response.status as number).json(response) })

PeCatRouter.put('/:id', ID_PARAM, havePerm, async (req: Request, res: Response) => { const response = await controller.updateId(req.params.id, req.body); return res.status(response.status as number).json(response) })

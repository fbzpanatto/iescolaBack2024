import { Router, Request, Response } from "express";
import { pCatCtrl } from "../controller/personCategory";
import havePerm from "../middleware/havePermission";

export const PeCatRouter = Router();

PeCatRouter.get('/', havePerm, async (req: Request, res: Response) => { const response = await pCatCtrl.findAllPerCat(req); return res.status(response.status as number).json(response)})

PeCatRouter.get('/:id', havePerm, async (req: Request, res: Response) => { const response = await pCatCtrl.findOneById(req.params.id, req); return res.status(response.status as number).json(response) })

PeCatRouter.post('/', havePerm, async (req: Request, res: Response) => { const response = await pCatCtrl.save(req.body, {}); return res.status(response.status as number).json(response) })

PeCatRouter.put('/:id', havePerm, async (req: Request, res: Response) => { const response = await pCatCtrl.updateId(req.params.id, req.body); return res.status(response.status as number).json(response) })

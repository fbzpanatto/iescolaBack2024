import { Router, Request } from "express";
import { bimesterController as controller } from "../controller/bimester";
import { ID_PARAM } from "../middleware/validators";

export const BimesterRouter = Router();

BimesterRouter.get('/', async(req: Request, res: any) => { const response = await controller.findAllWhere(); return res.status(response.status).json(response)})

BimesterRouter.get('/:id', ID_PARAM, async(req: Request, res: any) => { const response = await controller.findOneById(req.params.id, req); return res.status(response.status).json(response)})

BimesterRouter.post('/', async(req: Request, res: any) => { const response = await controller.save(req.body, {}); return res.status(response.status).json(response)})

BimesterRouter.put('/:id', ID_PARAM, async (req: Request, res: any) => { const response = await controller.updateId(req.params.id, req.body); return res.status(response.status).json(response)})
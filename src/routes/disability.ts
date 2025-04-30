import { Router, Request } from "express";
import { disabilityController as controller } from "../controller/disability";
import {ID_PARAM} from "../middleware/validators";

export const DisabilityRouter = Router();

DisabilityRouter.get('/', async (req: Request, res: any ) => { const response = await controller.findAllWhere({}); return res.status(response.status).json(response)})

DisabilityRouter.get('/:id', ID_PARAM, async (req: Request, res: any ) => { const response = await controller.findOneById(req.params.id, req); return res.status(response.status).json(response)})

DisabilityRouter.post('/', async (req: Request, res: any ) => { const response = await controller.save(req.body, {}); return res.status(response.status).json(response)})

DisabilityRouter.put('/:id', ID_PARAM, async (req: Request, res: any ) => { const response = await controller.updateId(req.params.id, req.body); return res.status(response.status).json(response)})
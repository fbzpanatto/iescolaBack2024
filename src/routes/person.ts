import { Router, Request } from "express";
import { personController as controller } from "../controller/person";
import {ID_PARAM} from "../middleware/validators";

export const PersonRouter = Router();

PersonRouter.get('/', async (req: Request, res: any) => { const response = await controller.findAllWhere({}); return res.status(response.status as number).json(response)})

PersonRouter.get('/:id', ID_PARAM, async (req: Request, res: any) => { const response = await controller.findOneById(req.params.id, req); return res.status(response.status as number).json(response) })

PersonRouter.post('/', async (req: Request, res: any) => { const response = await controller.save(req.body, {}); return res.status(response.status as number).json(response) });

PersonRouter.put('/:id', ID_PARAM, async (req: Request, res: any) => { const response = await controller.updateId(req.params.id, req.body); return res.status(response.status as number).json(response) });

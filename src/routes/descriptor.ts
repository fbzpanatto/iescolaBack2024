import { Router, Request, Response } from "express";
import { descriptorController as controller } from "../controller/descriptor";
import {ID_PARAM} from "../middleware/validators";

export const DescriptorRouter = Router();

DescriptorRouter.get('/', async (req: Request, res: Response ) => { const response = await controller.findAllWhere({}, req); return res.status(response.status).json(response)})

DescriptorRouter.get('/:id', ID_PARAM, async (req: Request, res: Response ) => { const response = await controller.findOneById(req.params.id, req); return res.status(response.status).json(response)})

DescriptorRouter.post('/', async (req: Request, res: Response ) => { const response = await controller.save(req.body, {}); return res.status(response.status).json(response)})

DescriptorRouter.put('/:id', ID_PARAM, async (req: Request, res: Response ) => { const response = await controller.updateId(req.params.id, req.body); return res.status(response.status).json(response)})
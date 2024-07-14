import { Router } from "express";
import { bimesterController } from "../controller/bimester";

export const BimesterRouter = Router();

BimesterRouter.get('/', async(req, res) => { const response = await bimesterController.findAllWhere(); return res.status(response.status).json(response)})

BimesterRouter.get('/:id', async(req, res) => { const response = await bimesterController.findOneById(req.params.id, req); return res.status(response.status).json(response)})

BimesterRouter.post('/', async(req, res) => { const response = await bimesterController.save(req.body, {}); return res.status(response.status).json(response)})

BimesterRouter.put('/:id', async (req, res) => { const response = await bimesterController.updateId(req.params.id, req.body); return res.status(response.status).json(response)})
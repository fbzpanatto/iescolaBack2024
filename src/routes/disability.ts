import { Router } from "express";
import { disabilityController } from "../controller/disability";

export const DisabilityRouter = Router();

DisabilityRouter.get('/', async (req, res) => { const response = await disabilityController.findAllWhere({}); return res.status(response.status).json(response)})

DisabilityRouter.get('/:id', async (req, res) => { const response = await disabilityController.findOneById(req.params.id, req); return res.status(response.status).json(response)})

DisabilityRouter.post('/', async (req, res) => { const response = await disabilityController.save(req.body, {}); return res.status(response.status).json(response)})

DisabilityRouter.put('/:id', async (req, res) => { const response = await disabilityController.updateId(req.params.id, req.body); return res.status(response.status).json(response)})
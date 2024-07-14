import { Router } from "express";
import { descriptorController } from "../controller/descriptor";

export const DescriptorRouter = Router();

DescriptorRouter.get('/', async(req, res) => { const response = await descriptorController.findAllWhere({}, req); return res.status(response.status).json(response)})

DescriptorRouter.get('/:id', async(req, res) => { const response = await descriptorController.findOneById(req.params.id, req); return res.status(response.status).json(response)})

DescriptorRouter.post('/', async(req, res) => { const response = await descriptorController.save(req.body, {}); return res.status(response.status).json(response)})

DescriptorRouter.put('/:id', async(req, res) => { const response = await descriptorController.updateId(req.params.id, req.body); return res.status(response.status).json(response)})
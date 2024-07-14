import { Router } from "express";
import {discController} from "../controller/discipline";

export const DisciplineRouter = Router();

DisciplineRouter.get('/', async (req, res) => { const response = await discController.getAllDisciplines(req); return res.status(response.status).json(response)})

DisciplineRouter.get('/:id', async (req, res) => { const response = await discController.findOneById(req.params.id, req); return res.status(response.status).json(response)})

DisciplineRouter.post('/', async (req, res) => { const response = await discController.save(req.body, {}); return res.status(response.status).json(response)})

DisciplineRouter.put('/:id', async (req, res) => { const response = await discController.updateId(req.params.id, req.body); return res.status(response.status).json(response)})
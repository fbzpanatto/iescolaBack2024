import { Router } from "express";
import { discController as controller } from "../controller/discipline";
import {ID_PARAM} from "../middleware/validators";

export const DisciplineRouter = Router();

DisciplineRouter.get('/', async (req, res) => { const response = await controller.getAllDisciplines(req); return res.status(response.status).json(response)})

DisciplineRouter.get('/:id', ID_PARAM, async (req, res) => { const response = await controller.findOneById(req.params?.id, req); return res.status(response.status).json(response)})

DisciplineRouter.post('/', async (req, res) => { const response = await controller.save(req.body, {}); return res.status(response.status).json(response)})

DisciplineRouter.put('/:id', ID_PARAM, async (req, res) => { const response = await controller.updateId(req.params?.id, req.body); return res.status(response.status).json(response)})
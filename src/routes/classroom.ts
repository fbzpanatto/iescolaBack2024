import { Router } from "express";
import { classroomController } from "../controller/classroom";

export const ClassroomRouter = Router();

ClassroomRouter.get('/', async (req, res) => { const response = await classroomController.getAllClassrooms(req); return res.status(response.status).json(response)})

ClassroomRouter.get('/:id', async (req, res) => { const response = await classroomController.findOneById(req.params.id, req); return res.status(response.status).json(response)})

ClassroomRouter.post('/', async (req, res) => { const response = await classroomController.save(req.body, {}); return res.status(response.status).json(response)})

ClassroomRouter.put('/:id', async (req, res) => { const response = await classroomController.updateId(req.params.id, req.body); return res.status(response.status).json(response)})
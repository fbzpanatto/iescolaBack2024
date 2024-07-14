import { Router } from "express";
import { classCatController } from "../controller/classroomCategory";

export const CassroomCategoryRouter = Router();

CassroomCategoryRouter.get('/', async (req, res) => { const response = await classCatController.findAllWhere({}); return res.status(response.status).json(response)})

CassroomCategoryRouter.get('/:id', async (req, res) => { const response = await classCatController.findOneById(req.params.id, req); return res.status(response.status).json(response)})

CassroomCategoryRouter.post('/', async (req, res) => { const response = await classCatController.save(req.body, {}); return res.status(response.status).json(response)})

CassroomCategoryRouter.put('/:id', async (req, res) => { const response = await classCatController.updateId(req.params.id, req.body); return res.status(response.status).json(response)})

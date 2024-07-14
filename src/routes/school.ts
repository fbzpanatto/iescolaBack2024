import { Router, Request, Response } from "express";
import { schoolController as controller } from "../controller/school";
import {ID_PARAM} from "../middleware/validators";

export const SchoolRouter = Router();

SchoolRouter.get('/', async (req: Request, res: Response) => {
  const response = await controller.findAllWhere({}); return res.status(response.status).json(response)
})

SchoolRouter.get('/:id', ID_PARAM, async (req: Request, res: Response) => {
  const response = await controller.findOneById(req.params.id, req); return res.status(response.status).json(response)
})

SchoolRouter.post('/', async (req: Request, res: Response) => {
  const response = await controller.save(req.body, {}); return res.status(response.status).json(response)
});

SchoolRouter.put('/:id', ID_PARAM, async (req: Request, res: Response) => {
  const response = await controller.updateId(req.params.id, req.body); return res.status(response.status).json(response)
});

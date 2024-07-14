import { Router, Request, Response } from "express";
import { schoolController } from "../controller/school";

export const SchoolRouter = Router();

SchoolRouter.get('/', async (req: Request, res: Response) => {
  const response = await schoolController.findAllWhere({}); return res.status(response.status).json(response)
})

SchoolRouter.get('/:id', async (req: Request, res: Response) => {
  const response = await schoolController.findOneById(req.params.id, req); return res.status(response.status).json(response)
})

SchoolRouter.post('/', async (req: Request, res: Response) => {
  const response = await schoolController.save(req.body, {}); return res.status(response.status).json(response)
});

SchoolRouter.put('/:id', async (req: Request, res: Response) => {
  const response = await schoolController.updateId(req.params.id, req.body); return res.status(response.status).json(response)
});

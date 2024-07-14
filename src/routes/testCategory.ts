import { Router, Request, Response } from "express";
import { testCategoryController as controller } from "../controller/testCategory";
import { ID_PARAM } from "../middleware/validators";

export const TestCategoryRouter = Router();

TestCategoryRouter.get('/', async (req: Request, res: Response) => {
  const response = await controller.findAllWhere({}); return res.status(response.status).json(response)
})

TestCategoryRouter.get('/:id', ID_PARAM, async (req: Request, res: Response) => {
  const response = await controller.findOneById(req.params.id, req); return res.status(response.status).json(response)
})

TestCategoryRouter.post('/', async (req: Request, res: Response) => {
  const response = await controller.save(req.body, {}); return res.status(response.status).json(response)
});

TestCategoryRouter.put('/:id',ID_PARAM,  async (req: Request, res: Response) => {
  const response = await controller.updateId(req.params.id, req.body); return res.status(response.status).json(response)
});

import { Router, Request, Response } from "express";
import { topicController as controller } from "../controller/topic";
import { ID_PARAM } from "../middleware/validators";

export const TopicRouter = Router();

TopicRouter.get('/', async (req: Request, res: Response) => {
  const response = await controller.findAllWhere({}, req); return res.status(response.status).json(response)
})

TopicRouter.get('/:id', ID_PARAM, async (req: Request, res: Response) => {
  const response = await controller.findOneById(req.params?.id, req); return res.status(response.status).json(response)
})

TopicRouter.post('/', async (req: Request, res: Response) => {
  const response = await controller.save(req.body, {}); return res.status(response.status).json(response)
});

TopicRouter.put('/:id', ID_PARAM, async (req: Request, res: Response) => {
  const response = await controller.updateId(req.params?.id, req.body); return res.status(response.status).json(response)
})
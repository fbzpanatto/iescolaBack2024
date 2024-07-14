import { Router, Request, Response } from "express";
import { stateController } from "../controller/state";
import { ID_PARAM } from "../middleware/validators";

export const StateRouter = Router();

StateRouter.get('/', async (req: Request, res: Response) => {
  const response = await stateController.findAllWhere({}); return res.status(response.status).json(response)
})

StateRouter.get('/:id', ID_PARAM, async (req: Request, res: Response) => {
  const response = await stateController.findOneById(req.params.id, req); return res.status(response.status).json(response)
})

StateRouter.post('/', async (req: Request, res: Response) => {
  const response = await stateController.save(req.body, {}); return res.status(response.status).json(response)
});

StateRouter.put('/:id', ID_PARAM, async (req: Request, res: Response) => {
  const response = await stateController.updateId(req.params.id, req.body); return res.status(response.status).json(response)
});

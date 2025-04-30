import { Router, Request } from "express";
import { stateController as controller } from "../controller/state";
import { ID_PARAM } from "../middleware/validators";

export const StateRouter = Router();

StateRouter.get('/', async (req: Request, res: any) => {
  const response = await controller.findAllWhere({}); return res.status(response.status).json(response)
})

StateRouter.get('/:id', ID_PARAM, async (req: Request, res: any) => {
  const response = await controller.findOneById(req.params.id, req); return res.status(response.status).json(response)
})

StateRouter.post('/', async (req: Request, res: any) => {
  const response = await controller.save(req.body, {}); return res.status(response.status).json(response)
});

StateRouter.put('/:id', ID_PARAM, async (req: Request, res: any) => {
  const response = await controller.updateId(req.params.id, req.body); return res.status(response.status).json(response)
});

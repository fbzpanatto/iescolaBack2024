import { Router, Request, Response } from "express";
import { stateController as controller } from "../controller/state";
import { ID_PARAM } from "../middleware/validators";
import { sendResponse } from "../utils/sendResponse";

export const StateRouter = Router();

StateRouter.get('/', async (req: Request, res: Response) => {
  const response = await controller.findAllWhere({}); return sendResponse(res, response)
})

StateRouter.get('/:id', ID_PARAM, async (req: Request<{ id: string }>, res: Response) => {
  const response = await controller.findOneById(req.params.id, req); return sendResponse(res, response)
})

StateRouter.post('/', async (req: Request, res: Response) => {
  const response = await controller.save(req.body, {}); return sendResponse(res, response)
});

StateRouter.put('/:id', ID_PARAM, async (req: Request<{ id: string }>, res: Response) => {
  const response = await controller.updateId(req.params.id, req.body); return sendResponse(res, response)
});

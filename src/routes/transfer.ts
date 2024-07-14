import { Router, Request, Response } from 'express'
import { transferController as controller } from "../controller/transfer";
import havePermission from "../middleware/havePermission";
import { ID_PARAM, YEAR_NAME_PARAM } from "../middleware/validators";

export const TransferRouter = Router();

TransferRouter.get('/:year', YEAR_NAME_PARAM, havePermission, async (req: Request, res: Response) => {
  const response = await controller.findAllWhere({}, req); return res.status(response.status).json(response)
})

TransferRouter.get('/:id', ID_PARAM, havePermission, async (req: Request, res: Response) => {
  const response = await controller.findOneById(req.params.id, req); return res.status(response.status).json(response)
})

TransferRouter.post('/', havePermission, async (req: Request, res: Response) => {
  const response = await controller.save(req.body, {}); return res.status(response.status).json(response)
});

TransferRouter.put('/:id', ID_PARAM, havePermission, async (req: Request, res: Response) => {
  const response = await controller.updateId(req.params.id, req.body); return res.status(response.status).json(response)
});
import { Router, Request, Response } from 'express'
import { transferController as controller } from "../controller/transfer";
import havePermission from "../middleware/havePermission";
import { ID_PARAM, YEAR_NAME_PARAM } from "../middleware/validators";
import { sendResponse } from "../utils/sendResponse";

export const TransferRouter = Router();

TransferRouter.get('/:year', YEAR_NAME_PARAM, havePermission, async (req: Request, res: Response) => {
  const response = await controller.findAllWhere({}, req); return sendResponse(res, response)
})

TransferRouter.get('/:id', ID_PARAM, havePermission, async (req: Request<{ id: string }>, res: Response) => {
  const response = await controller.findOneById(req.params.id, req); return sendResponse(res, response)
})

TransferRouter.post('/', havePermission, async (req: Request, res: Response) => {
  const response = await controller.saveWithAuth(req.body, req.user, {}); return sendResponse(res, response)
});

TransferRouter.put('/:id', ID_PARAM, havePermission, async (req: Request<{ id: string }>, res: Response) => {
  const response = await controller.updateIdWithAuth(req.params.id, req.body, req.user); return sendResponse(res, response)
});
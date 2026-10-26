import { Router, Request, Response } from "express"
import { tokenController as controller } from "../controller/token";
import havePermission from "../middleware/havePermission";
import { sendResponse } from "../utils/sendResponse";

export const TokenRouter = Router();

TokenRouter.get('/form', havePermission, async (req: Request, res: Response) => {
  const response = await controller.getFormData(req, req.user); return sendResponse(res, response)
});

TokenRouter.get('/:year/all', havePermission, async (req: Request, res: Response) => {
  const response = await controller.getAllTokens(req, req.user); return sendResponse(res, response)
});

TokenRouter.post('/', havePermission, async (req: Request, res: Response) => {
  const response = await controller.saveToken(req.body, req.user); return sendResponse(res, response)
});
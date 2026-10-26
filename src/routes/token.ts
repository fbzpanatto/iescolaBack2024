import { Router, Request, Response } from "express"
import { tokenController as controller } from "../controller/token";
import havePermission from "../middleware/havePermission";

export const TokenRouter = Router();

TokenRouter.get('/form', havePermission, async (req: Request, res: Response) => {
  const response = await controller.getFormData(req, req.user); return res.status(response.status).json(response)
});

TokenRouter.get('/:year/all', havePermission, async (req: Request, res: Response) => {
  const response = await controller.getAllTokens(req, req.user); return res.status(response.status).json(response)
});

TokenRouter.post('/', havePermission, async (req: Request, res: Response) => {
  const response = await controller.saveToken(req.body, req.user); return res.status(response.status).json(response)
});
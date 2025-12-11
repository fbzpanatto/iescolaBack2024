import { Router, Request } from "express"
import { tokenController as controller } from "../controller/token";
import havePermission from "../middleware/havePermission";

export const TokenRouter = Router();

TokenRouter.get('/:year/all', havePermission, async (req: Request, res: any) => {
  const response = await controller.getAllTokens(req); return res.status(response.status).json(response)
});

TokenRouter.get('/:id', havePermission, async (req: Request, res: any) => {
  const response = await controller.getToken(req); return res.status(response.status).json(response)
});
import { Request, Router } from "express";
import { historyController as controller } from "../controller/history";
import havePermission from "../middleware/havePermission";

export const HistoryRouter = Router();

HistoryRouter.get('/', havePermission, async (req: Request, res: any) => {
  const response = await controller.getHistory(req);
  return res.status(response.status).json(response)
})
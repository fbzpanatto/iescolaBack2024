import { Request, Router, Response } from "express";
import { historyController as controller } from "../controller/history";
import havePermission from "../middleware/havePermission";
import { sendResponse } from "../utils/sendResponse";

export const HistoryRouter = Router();

HistoryRouter.get('/', havePermission, async (req: Request, res: Response) => {
  const response = await controller.getHistory(req, req.user);
  return sendResponse(res, response)
})
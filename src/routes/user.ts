import { Router, Request, Response } from "express";
import { userController as controller } from "../controller/user";
import { sendResponse } from "../utils/sendResponse";

export const UserRouter = Router();

UserRouter.post('/', async (req: Request, res: Response) => {
  const response = await controller.save(req.body, {}); return sendResponse(res, response)
});

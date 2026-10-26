import { Router, Request, Response } from "express";
import { loginCtrl as controller } from "../controller/login";
import { sendResponse } from "../utils/sendResponse";

export const LoginRouter = Router();

LoginRouter.post('/student', async (req: Request, res: Response) => {
  const response = await controller.studentLogin(req); return sendResponse(res, response)
})

LoginRouter.post('/', async (req: Request, res: Response) => {
  const response = await controller.login(req); return sendResponse(res, response)
})

LoginRouter.post('/renew-password', async (req: Request, res: Response) => {
  const response = await controller.updatePassword(req); return sendResponse(res, response)
})

import { Router, Request, Response } from "express";
import { loginCtrl as controller } from "../controller/login";

export const LoginRouter = Router();

LoginRouter.post('/', async (req: Request, res: Response) => {
  const response = await controller.login(req); return res.status(response.status as number).json(response)
})

LoginRouter.post('/renew-password', async (req: Request, res: Response) => {
  const response = await controller.renewPassword(req); return res.status(response.status as number).json(response)
})

import { Router, Request, Response } from "express";
import { loginCtrl as controller } from "../controller/login";

export const LoginRouter = Router();

LoginRouter.post('/student', async (req: Request, res: Response) => {
  const response = await controller.studentLogin(req); return res.status(response.status as number).json(response)
})

LoginRouter.post('/', async (req: Request, res: Response) => {
  const response = await controller.login(req); return res.status(response.status as number).json(response)
})

LoginRouter.post('/renew-password', async (req: Request, res: Response) => {
  const response = await controller.updatePassword(req); return res.status(response.status as number).json(response)
})

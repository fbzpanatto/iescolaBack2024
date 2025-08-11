import { Router, Request } from "express";
import { loginCtrl as controller } from "../controller/login";

export const LoginRouter = Router();

LoginRouter.post('/student', async (req: Request, res: any) => {
  const response = await controller.studentLogin(req); return res.status(response.status as number).json(response)
})

LoginRouter.post('/', async (req: Request, res: any) => {
  const response = await controller.login(req); return res.status(response.status as number).json(response)
})

LoginRouter.post('/renew-password', async (req: Request, res: any) => {
  const response = await controller.renewPassword(req); return res.status(response.status as number).json(response)
})

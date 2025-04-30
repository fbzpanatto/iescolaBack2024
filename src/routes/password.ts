import { Router, Request } from "express";
import { passwordController as controller } from "../controller/password";

export const PasswordRouter = Router();

PasswordRouter.post('/', async (req: Request, res: any) => { const response = await controller.resetPassword(req); return res.status(response.status as number).json(response) })

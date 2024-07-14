import { Router, Request, Response } from "express";
import { passwordController as controller } from "../controller/password";

export const PasswordRouter = Router();

PasswordRouter.post('/', async (req: Request, res: Response) => { const response = await controller.resetPassword(req); return res.status(response.status as number).json(response) })

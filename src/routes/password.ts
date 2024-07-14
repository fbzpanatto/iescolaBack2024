import { Router, Request, Response } from "express";
import { passwordController } from "../controller/password";

export const PasswordRouter = Router();

PasswordRouter.post('/', async (req: Request, res: Response) => { const response = await passwordController.resetPassword(req); return res.status(response.status as number).json(response) })

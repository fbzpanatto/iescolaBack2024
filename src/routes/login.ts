import { Router, Request, Response } from "express";
import { loginCtrl } from "../controller/login";

export const LoginRouter = Router();

LoginRouter.post('/', async (req: Request, res: Response) => { const response = await loginCtrl.login(req); return res.status(response.status as number).json(response)})

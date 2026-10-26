import { Router, Request, Response } from "express";
import { passwordController as controller } from "../controller/password";
import { sendResponse } from "../utils/sendResponse";

export const PasswordRouter = Router();

PasswordRouter.post('/', async (req: Request, res: Response) => { const response = await controller.requestTokenForResetPassword(req); return sendResponse(res, response) })

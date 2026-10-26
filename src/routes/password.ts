import { Router, Request, Response } from "express";
import { passwordController as controller } from "../controller/password";
import { sendResponse } from "../utils/sendResponse";
import { resetPasswordLimiter } from "../middleware/rateLimit";

export const PasswordRouter = Router();

PasswordRouter.post('/', resetPasswordLimiter, async (req: Request, res: Response) => { const response = await controller.requestTokenForResetPassword(req); return sendResponse(res, response) })

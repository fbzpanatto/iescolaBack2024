import { Router, Request, Response } from "express";
import { contactController as controller } from "../controller/contact";
import { sendResponse } from "../utils/sendResponse";
import { contactLimiter } from "../middleware/rateLimit";

export const ContactRouter = Router();

ContactRouter.post('/', contactLimiter, async (req: Request, res: Response) => { const response = await controller.send(req); return sendResponse(res, response) })

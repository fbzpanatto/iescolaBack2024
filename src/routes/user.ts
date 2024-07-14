import { Router, Request, Response } from "express";
import { userController as controller } from "../controller/user";

export const UserRouter = Router();

UserRouter.post('/', async (req: Request, res: Response) => {
  const response = await controller.save(req.body); return res.status(response.status).json(response)
});

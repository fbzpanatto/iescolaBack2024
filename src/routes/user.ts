import { Router, Request } from "express";
import { userController as controller } from "../controller/user";

export const UserRouter = Router();

UserRouter.post('/', async (req: Request, res: any) => {
  const response = await controller.save(req.body); return res.status(response.status).json(response)
});

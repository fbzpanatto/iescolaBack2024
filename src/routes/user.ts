import { Router } from "express";
import { userController } from "../controller/user";

export const UserRouter = Router();

UserRouter.post('/', (req, res) => {

  userController.save(req.body)
    .then(r => res.status(r.status).json(r))
    .catch(e => res.status(e.status).json(e))
});

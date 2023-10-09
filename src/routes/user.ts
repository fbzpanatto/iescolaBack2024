import { Router } from "express";
import { userController } from "../controller/user";

export const UserRouter = Router();

UserRouter.post('/auth', (req, res) => {

  userController.login(req)
    .then(r => res.status(r.status).json(r))
    .catch(e => res.status(e.status).json(e))
})

UserRouter.post('/create', (req, res) => {

  userController.save(req.body)
    .then(r => res.status(r.status).json(r))
    .catch(e => res.status(e.status).json(e))
});

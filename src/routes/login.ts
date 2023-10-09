import { Router } from "express";
import { loginController } from "../controller/login";

export const LoginRouter = Router();

LoginRouter.post('/', (req, res) => {

  loginController.login(req)
    .then(r => res.status(r.status).json(r))
    .catch(e => res.status(e.status).json(e))
})

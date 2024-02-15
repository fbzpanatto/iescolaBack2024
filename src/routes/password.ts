import { Router } from "express";
import { passwordController } from "../controller/password";

export const PasswordRouter = Router();

PasswordRouter.post('/', (req, res) => {

  passwordController.resetPassword(req)
    .then(r => res.status(r.status).json(r))
    .catch(e => res.status(e.status).json(e))
})

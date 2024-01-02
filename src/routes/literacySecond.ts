import { Router } from "express";
import { literacySecondController } from "../controller/literacySecond";
import havePermission from "../middleware/havePermission";

export const LiteracySecondRouter = Router();

LiteracySecondRouter.get('/:year', havePermission, (req, res) => {

  literacySecondController.getClassrooms(req)
    .then(r => res.status(r.status).json(r))
    .catch(e => res.status(e.status).json(e))
})

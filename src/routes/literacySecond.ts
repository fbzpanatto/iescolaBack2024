import { Router, Response, Request } from "express";
import { litSecCtrl as controller } from "../controller/literacySecond";
import havePermission from "../middleware/havePermission";
import {YEAR_NAME_PARAM} from "../middleware/validators";

export const LiteracySecondRouter = Router();

LiteracySecondRouter.get('/:year', YEAR_NAME_PARAM, havePermission, async (req: Request, res: Response) => { const response = await controller.getClassrooms(req); return res.status(response.status).json(response)})

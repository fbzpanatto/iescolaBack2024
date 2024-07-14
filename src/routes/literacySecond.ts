import { Router, Response, Request } from "express";
import { litSecCtrl } from "../controller/literacySecond";
import havePermission from "../middleware/havePermission";

export const LiteracySecondRouter = Router();

LiteracySecondRouter.get('/:year', havePermission, async (req: Request, res: Response) => { const response = await litSecCtrl.getClassrooms(req); return res.status(response.status).json(response)})

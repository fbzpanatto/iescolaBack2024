import { Router, Request, Response } from "express";
import { Data } from "../interfaces/interfaces"
import { reportController } from "../controller/report";
import havePermission from "../middleware/havePermission";

export const ReportRouter = Router();

ReportRouter.get('/:year', havePermission, async (req: Request, res: Response) => { const data: Data = await reportController.reportFindAll(req); return res.status(data.status).json(data) })
ReportRouter.get('/:id/:year', havePermission, async (req: Request, res: Response) => { const data: Data = await reportController.getReport(req); return res.status(data.status).json(data) })
ReportRouter.get('/:id/:year/avg', havePermission, async (req: Request, res: Response) => { const data: Data = await reportController.getSchoolAvg(req); return res.status(data.status).json(data)})

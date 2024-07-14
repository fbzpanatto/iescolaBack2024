import { Router, Request, Response } from "express";
import { literacyReportController } from "../controller/report-literacy-controller";
import havePermission from "../middleware/havePermission";
import { CLASSROOM_ID_PARAM, YEAR_ID_PARAM } from "../middleware/validators";

export const ReportLiteracy = Router();

ReportLiteracy.get('/:classroom/:year', [ CLASSROOM_ID_PARAM, YEAR_ID_PARAM ], havePermission, async (req: Request, res: Response) => {
  const response= await literacyReportController.getReport(req); return res.status(response.status).json(response)
})

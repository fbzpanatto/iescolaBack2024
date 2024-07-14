import { Router, Request, Response } from "express";
import { literacyReportController as controller } from "../controller/report-literacy-controller";
import havePermission from "../middleware/havePermission";
import { CLASSROOM_ID_PARAM, YEAR_NAME_PARAM } from "../middleware/validators";

export const ReportLiteracy = Router();

ReportLiteracy.get('/:classroom/:year', [ CLASSROOM_ID_PARAM, YEAR_NAME_PARAM ], havePermission, async (req: Request, res: Response) => {
  const response= await controller.getReport(req); return res.status(response.status).json(response)
})

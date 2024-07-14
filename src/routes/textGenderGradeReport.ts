import { Router, Request, Response } from "express";
import { textGenderGradeReportController as controller } from "../controller/textGenderGradeReport";
import { CLASSROOM_ID_PARAM, YEAR_NAME_PARAM } from "../middleware/validators";
import havePermission from "../middleware/havePermission";

export const TextGenderGradeReportRouter = Router();

TextGenderGradeReportRouter.get('/report/:classroom/:year/:textgender', [ CLASSROOM_ID_PARAM, YEAR_NAME_PARAM ], havePermission, async (req: Request, res: Response) => {
  const response = await controller.getReport(req); return res.status(response.status).json(response)
})

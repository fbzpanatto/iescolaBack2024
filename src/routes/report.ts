import { Router, Request, Response } from "express";
import { Data } from "../interfaces/interfaces"
import { reportController as controller } from "../controller/report";
import havePermission from "../middleware/havePermission";
import { ID_PARAM, YEAR_NAME_PARAM } from "../middleware/validators";

export const ReportRouter = Router();

ReportRouter.get('/:year', YEAR_NAME_PARAM, havePermission, async (req: Request, res: Response) =>
  { const data: Data = await controller.reportFindAll(req); return res.status(data.status).json(data) }
)

ReportRouter.get('/:id/:year', [ ID_PARAM, YEAR_NAME_PARAM ], havePermission, async (req: Request, res: Response) =>
  { const data: Data = await controller.getReport(req); return res.status(data.status).json(data) }
)

ReportRouter.get('/:id/:year/avg', [ ID_PARAM, YEAR_NAME_PARAM ], havePermission, async (req: Request, res: Response) =>
  { const data: Data = await controller.getSchoolAvg(req); return res.status(data.status).json(data) }
)

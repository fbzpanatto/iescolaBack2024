import { Router, Request } from "express";
import { Data } from "../interfaces/interfaces"
import { reportController as controller } from "../controller/report";
import havePermission from "../middleware/havePermission";
import { ID_PARAM, YEAR_NAME_PARAM } from "../middleware/validators";

export const ReportRouter = Router();

ReportRouter.get('/aggregate/find/:year', havePermission, async (req: Request, res: any) => {

  const classroom = req.query.classroom ?? req.params.classroom
  const bimester = req.query.bimester ?? req.params.bimester
  const year = req.query.year ?? req.params.year

  const data: Data = await controller.listAggregatedTests(Number(classroom), Number(bimester), String(year));
  return res.status(data.status).json(data);
})

ReportRouter.get('/aggregate/:category/:classroom/:bimester/:year', havePermission, async (req: Request, res: any) => {
  const data: Data = await controller.aggregatedTestResultFullParallel(req);
  return res.status(data.status).json(data);
})

ReportRouter.get('/:year', YEAR_NAME_PARAM, havePermission, async (req: Request, res: any) =>
  { const data: Data = await controller.reportFindAll(req); return res.status(data.status).json(data) }
)

ReportRouter.get('/:id/:year', [ ID_PARAM, YEAR_NAME_PARAM ], havePermission, async (req: Request, res: any) =>
  { const data: Data = await controller.getReport(req); return res.status(data.status).json(data) }
)

ReportRouter.get('/:id/:year/avg', [ ID_PARAM, YEAR_NAME_PARAM ], havePermission, async (req: Request, res: any) =>
  { const data: Data = await controller.getSchoolAvg(req); return res.status(data.status).json(data) }
)

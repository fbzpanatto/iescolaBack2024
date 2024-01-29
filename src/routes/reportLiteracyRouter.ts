import { Router } from "express";
import { reportLiteracyController } from "../controller/report-literacy-controller";
import havePermission from "../middleware/havePermission";

export const ReportLiteracyRouter = Router();

ReportLiteracyRouter.get('/:classroom/:year', havePermission, (req, res) => {

  reportLiteracyController.getReport(req)
    .then(r => res.status(r.status).json(r))
    .catch(e => res.status(e.status).json(e))
})

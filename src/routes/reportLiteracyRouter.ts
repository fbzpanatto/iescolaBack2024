import { Router } from "express";
import { reportLiteracyController } from "../controller/report-literacy-controller";

export const ReportLiteracyRouter = Router();

ReportLiteracyRouter.get('/:classroom/:year', (req, res) => {

  reportLiteracyController.getReport(req)
    .then(r => res.status(r.status).json(r))
    .catch(e => res.status(e.status).json(e))
})

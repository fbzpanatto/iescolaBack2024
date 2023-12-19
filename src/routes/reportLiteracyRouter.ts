import { Router } from "express";
import { reportLiteracyController } from "../controller/report-literacy-controller";

export const ReportLiteracyRouter = Router();

ReportLiteracyRouter.get('/:year/all', (req, res) => {

  reportLiteracyController.findAllWhere({}, req)
    .then(r => res.status(r.status).json(r))
    .catch(e => res.status(e.status).json(e))
})

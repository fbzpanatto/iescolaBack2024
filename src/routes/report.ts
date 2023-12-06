import { Router } from "express";
import {reportController} from "../controller/report";
import havePermission from "../middleware/havePermission";

export const ReportRouter = Router();

ReportRouter.get('/:year', havePermission, (req, res) => {

  reportController.findAllWhere({}, req)
    .then(r => res.status(r.status).json(r))
    .catch(e => res.status(e.status).json(e))
})

ReportRouter.get('/:id', havePermission, (req, res) => {

  reportController.getReport(req)
    .then(r => res.status(r.status).json(r))
    .catch(e => res.status(e.status).json(e))
})

ReportRouter.get('/:id/avg', havePermission, (req, res) => {

  reportController.getSchoolAvg(req)
    .then(r => res.status(r.status).json(r))
    .catch(e => res.status(e.status).json(e))
})

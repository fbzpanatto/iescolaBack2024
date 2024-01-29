import { Router } from "express";
import { textGenderGradeReportController } from "../controller/textGenderGradeReport";
import havePermission from "../middleware/havePermission";

export const TextGenderGradeReportRouter = Router();

TextGenderGradeReportRouter.get('/report/:classroom/:year/:textgender', havePermission, (req, res) => {

  textGenderGradeReportController.getReport(req)
    .then(r => res.status(r.status).json(r))
    .catch(e => res.status(e.status).json(e))
})

import { Router } from "express";
import { textGenderGradeController } from "../controller/textGenderGrade";
import havePermission from "../middleware/havePermission";

export const TextGenderGradeRouter = Router();

TextGenderGradeRouter.get('/report/:classroom/:year/:textgender', havePermission, (req, res) => {

  textGenderGradeController.getReport(req)
    .then(r => res.status(r.status).json(r))
    .catch(e => res.status(e.status).json(e))
})

TextGenderGradeRouter.get('/:classroom/:year/:gender', havePermission, (req, res) => {

  textGenderGradeController.getAll(req)
    .then(r => res.status(r.status).json(r))
    .catch(e => res.status(e.status).json(e))
})

TextGenderGradeRouter.get('/:classroom/:year', havePermission, (req, res) => {

  textGenderGradeController.getTotals(req)
    .then(r => res.status(r.status).json(r))
    .catch(e => res.status(e.status).json(e))
})

TextGenderGradeRouter.put('/:studentClassroomId', havePermission, (req, res) => {

  textGenderGradeController.updateStudentTextGenderExamGrade(req.body)
    .then(r => res.status(r.status).json(r))
    .catch(e => res.status(e.status).json(e))
})

import { Router } from "express";
import { textGenderClassroomController } from "../controller/textGenderClassroom";

export const TextGenderClassroomRouter = Router();

TextGenderClassroomRouter.get('/:id', (req, res) => {

  textGenderClassroomController.getTabs(req)
    .then(r => res.status(r.status).json(r))
    .catch(e => res.status(e.status).json(e))
})

TextGenderClassroomRouter.get('/report/:classroomNumber', (req, res) => {

  textGenderClassroomController.getTabsReport(req)
    .then(r => res.status(r.status).json(r))
    .catch(e => res.status(e.status).json(e))
})

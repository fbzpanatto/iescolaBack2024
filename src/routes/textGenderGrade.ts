import { Router } from "express";
import { textGenderGradeController } from "../controller/textGenderGrade";

export const TextGenderGradeRouter = Router();

TextGenderGradeRouter.get('/:classroom/:year/:gender', (req, res) => {

  textGenderGradeController.getAll(req)
    .then(r => res.status(r.status).json(r))
    .catch(e => res.status(e.status).json(e))
})

import { Router, Request, Response } from "express";
import { textGenderGradeController as ctrl } from "../controller/textGenderGrade";
import { CLASSROOM_ID_PARAM, STUDENT_CLASSROOM_ID, YEAR_NAME_PARAM } from "../middleware/validators";
import havePermission from "../middleware/havePermission";

export const TextGenderGradeRouter = Router();

TextGenderGradeRouter.get('/:classroom/:year/:gender', [ CLASSROOM_ID_PARAM, YEAR_NAME_PARAM ], havePermission, async (req: Request, res: Response) => {
  const response = await ctrl.getAll(req); return res.status(response.status).json(response)
})

TextGenderGradeRouter.get('/:classroom/:year', [ CLASSROOM_ID_PARAM, YEAR_NAME_PARAM ], havePermission, async (req: Request, res: Response) => {
  const response = await ctrl.getTotals(req); return res.status(response.status).json(response)
})

TextGenderGradeRouter.put('/many', havePermission, async (req: Request, res: Response) => {
  const response = await ctrl.updateMany(req.body); return res.status(response.status).json(response)
})

TextGenderGradeRouter.put('/:studentClassroomId', STUDENT_CLASSROOM_ID, havePermission, async (req: Request, res: Response) => {
  const response = await ctrl.updateExamGrade(req.body); return res.status(response.status).json(response)
})
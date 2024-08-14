import { Request, Response, Router } from "express";
import { stuQuestCtrl as controller } from "../controller/StudentQuestion";
import { ID_PARAM, VALIDATE_STUDENT_QUESTIONSTATUS, BODY_VALIDATION_STUDENT_QUESTION, VALIDATE_STUDENT_QUESTIONANSWER, BODY_VALIDATION_STUDENT_ANSWER, YEAR_NAME_PARAM } from "../middleware/validators";
import havePermission from "../middleware/havePermission";

const UPDATE_VALIDATORS_ANSWER = [ID_PARAM, VALIDATE_STUDENT_QUESTIONANSWER, BODY_VALIDATION_STUDENT_ANSWER]
const UPDATE_VALIDATORS_STATUS = [ID_PARAM, VALIDATE_STUDENT_QUESTIONSTATUS, BODY_VALIDATION_STUDENT_QUESTION]

export const StudentQuestionRouter = Router();

StudentQuestionRouter.put('/:id/question', YEAR_NAME_PARAM, ...UPDATE_VALIDATORS_ANSWER, havePermission, async (req: Request, res: Response) => {
  const response = await controller.updateQuestion(req, req.body); return res.status(response.status).json(response)
});

StudentQuestionRouter.put('/:id/reading-fluency', YEAR_NAME_PARAM, havePermission, async (req: Request, res: Response) => {
  const response = await controller.updateReadingFluency(req); return res.status(response.status).json(response)
});

StudentQuestionRouter.put('/:id/test-status', ...UPDATE_VALIDATORS_STATUS, havePermission, async (req: Request, res: Response) => {
  const response = await controller.updateTestStatus(req.params.id, req.body); return res.status(response.status).json(response)
});

import { Request, Router } from "express";
import { stuQuestCtrl as controller } from "../controller/StudentQuestion";
import { ID_PARAM, VALIDATE_STUDENT_QUESTIONSTATUS, BODY_VALIDATION_STUDENT_QUESTION, VALIDATE_STUDENT_QUESTIONANSWER, BODY_VALIDATION_STUDENT_ANSWER, YEAR_NAME_PARAM } from "../middleware/validators";
import havePermission from "../middleware/havePermission";

const UPDATE_VALIDATORS_STATUS = [ID_PARAM, VALIDATE_STUDENT_QUESTIONSTATUS, BODY_VALIDATION_STUDENT_QUESTION]

export const StudentQuestionRouter = Router();

StudentQuestionRouter.put('/:id/question', YEAR_NAME_PARAM, ID_PARAM, VALIDATE_STUDENT_QUESTIONANSWER, BODY_VALIDATION_STUDENT_ANSWER, havePermission, async (req: Request, res: any) => {
  const response = await controller.updateQuestion(req, req.body, (req as any).user); return res.status(response.status).json(response)
});

StudentQuestionRouter.put('/:id/reading-fluency', YEAR_NAME_PARAM, havePermission, async (req: Request, res: any) => {
  const response = await controller.updateReadingFluency(req, (req as any).user); return res.status(response.status).json(response)
});

StudentQuestionRouter.put('/:id/alphabetic', YEAR_NAME_PARAM, havePermission, async (req: Request, res: any) => {
  const response = await controller.updateAlphabetic(req, (req as any).user); return res.status(response.status).json(response)
});

StudentQuestionRouter.put('/:id/test-status', ...UPDATE_VALIDATORS_STATUS, havePermission, async (req: Request<{ id: number | string }>, res: any) => {
  const response = await controller.updateTestStatus(req.params.id, req.body, (req as any).user); return res.status(response.status).json(response)
});

StudentQuestionRouter.put('/:id/alpha-status', havePermission, async (req: Request<{ id: number | string }>, res: any) => {
  const response = await controller.alphaStatus(req.params.id, req.body, (req as any).user); return res.status(response.status).json(response)
});

import { Request, Response, Router } from "express";
import { stuQuestCtrl } from "../controller/StudentQuestion";
import { ID_PARAM, VALIDATE_STUDENT_QUESTIONSTATUS, BODY_VALIDATION_STUDENT_QUESTION, VALIDATE_STUDENT_QUESTIONANSWER, BODY_VALIDATION_STUDENT_ANSWER} from "../middleware/validators";
import havePermission from "../middleware/havePermission";

const UPDATE_VALIDATORS_ANSWER = [ID_PARAM, VALIDATE_STUDENT_QUESTIONANSWER, BODY_VALIDATION_STUDENT_ANSWER]
const UPDATE_VALIDATORS_STATUS = [ID_PARAM, VALIDATE_STUDENT_QUESTIONSTATUS, BODY_VALIDATION_STUDENT_QUESTION]

export const StudentQuestionRouter = Router();

StudentQuestionRouter.put('/:id/question', ...UPDATE_VALIDATORS_ANSWER, havePermission, async (req: Request, res: Response) => {
  const response = await stuQuestCtrl.updateQuestion(req.params.id, req.body); return res.status(response.status).json(response)
});

StudentQuestionRouter.put('/:id/test-status', ...UPDATE_VALIDATORS_STATUS, havePermission, async (req: Request, res: Response) => {
  const response = await stuQuestCtrl.updateTestStatus(req.params.id, req.body); return res.status(response.status).json(response)
});

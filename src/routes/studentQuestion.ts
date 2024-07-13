import { Request, Response, Router } from "express";
import { studentQuestionController } from "../controller/StudentQuestion";
import { PARAM_ID, VALIDATE_STUDENT_QUESTIONSTATUS, BODY_VALIDATION_STUDENT_QUESTION, VALIDATE_STUDENT_QUESTIONANSWER, BODY_VALIDATION_STUDENT_ANSWER} from "../middleware/validators";
import havePermission from "../middleware/havePermission";

const UPDATE_VALIDATORS_ANSWER = [PARAM_ID, VALIDATE_STUDENT_QUESTIONANSWER, BODY_VALIDATION_STUDENT_ANSWER]
const UPDATE_VALIDATORS_STATUS = [PARAM_ID, VALIDATE_STUDENT_QUESTIONSTATUS, BODY_VALIDATION_STUDENT_QUESTION]

export const StudentQuestionRouter = Router();


StudentQuestionRouter.put('/:id/question', ...UPDATE_VALIDATORS_ANSWER, havePermission, (req: Request, res: Response) => {

  studentQuestionController.updateQuestion(req.params.id, req.body)
    .then(r => res.status(r.status).json(r))
    .catch(e => res.status(e.status).json(e))
});

StudentQuestionRouter.put('/:id/test-status', ...UPDATE_VALIDATORS_STATUS, havePermission, (req: Request, res: Response) => {

  studentQuestionController.updateTestStatus(req.params.id, req.body)
    .then(r => res.status(r.status).json(r))
    .catch(e => res.status(e.status).json(e))
});

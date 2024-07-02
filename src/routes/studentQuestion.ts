import { Request, Response, Router } from "express";
import { studentQuestionController } from "../controller/StudentQuestion";
import { VALIDATE_ID, VALIDATE_STUDENT_QUESTION, BODY_VALIDATION_STUDENT_QUESTION} from "../middleware/validators";
import havePermission from "../middleware/havePermission";

const UPDATE_VALIDATORS = [VALIDATE_ID, VALIDATE_STUDENT_QUESTION, BODY_VALIDATION_STUDENT_QUESTION]

export const StudentQuestionRouter = Router();


StudentQuestionRouter.put('/:id/question', havePermission, (req, res) => {

  studentQuestionController.updateQuestion(req.params.id, req.body)
    .then(r => res.status(r.status).json(r))
    .catch(e => res.status(e.status).json(e))
});

StudentQuestionRouter.put('/:id/test-status', ...UPDATE_VALIDATORS, havePermission, (req: Request, res: Response) => {

  studentQuestionController.updateTestStatus(req.params.id, req.body)
    .then(r => res.status(r.status).json(r))
    .catch(e => res.status(e.status).json(e))
});

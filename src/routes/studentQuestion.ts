import { Router } from "express";
import { studentQuestionController } from "../controller/StudentQuestion";
import havePermission from "../middleware/havePermission";

export const StudentQuestionRouter = Router();


StudentQuestionRouter.put('/:id/question', havePermission, (req, res) => {

  studentQuestionController.updateQuestion(req.params.id, req.body)
    .then(r => res.status(r.status).json(r))
    .catch(e => res.status(e.status).json(e))
});

StudentQuestionRouter.put('/:id/test-status', havePermission, (req, res) => {

  studentQuestionController.updateTestStatus(req.params.id, req.body)
    .then(r => res.status(r.status).json(r))
    .catch(e => res.status(e.status).json(e))
});

import { Request, Response, Router } from "express";
import { teacherController } from "../controller/teacher";
import { VALIDATE_ID, VALIDATE_TEACHER, BODY_VALIDATION_TEACHER} from "../middleware/validators";
import havePermission from "../middleware/havePermission";

const CREATE_VALIDATORS = [VALIDATE_TEACHER, BODY_VALIDATION_TEACHER]
const UPDATE_VALIDATORS = [VALIDATE_ID, VALIDATE_TEACHER, BODY_VALIDATION_TEACHER]

export const TeacherRouter = Router();

TeacherRouter.get('/pending-transfer', havePermission, (req, res) => {

  teacherController.getRequestedStudentTransfers(req)
    .then(r => res.status(r.status).json(r))
    .catch(e => res.status(e.status).json(e))
})

TeacherRouter.get('/', havePermission, (req, res) => {

  teacherController.findAllWhere({}, req)
    .then(r => res.status(r.status).json(r))
    .catch(e => res.status(e.status).json(e))
})

TeacherRouter.get('/:id', havePermission, (req, res) => {

  teacherController.findOneById(req.params.id, req)
    .then(r => res.status(r.status).json(r))
    .catch(e => res.status(e.status).json(e))
})

TeacherRouter.post('/', ...CREATE_VALIDATORS, havePermission, (req: Request, res: Response) => {

  teacherController.save(req.body, {})
    .then(r => res.status(r.status).json(r))
    .catch(e => res.status(e.status).json(e))
});

TeacherRouter.put('/:id', havePermission, (req: Request, res: Response) => {

  teacherController.updateId(req.params.id, req.body)
    .then(r => res.status(r.status).json(r))
    .catch(e => res.status(e.status).json(e))
});

TeacherRouter.delete('/:id', havePermission, (req, res) => {

  teacherController.deleteId(req.params.id)
    .then(r => res.status(r.status).json(r))
    .catch(e => res.status(e.status).json(e))
});

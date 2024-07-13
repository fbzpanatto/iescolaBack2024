import { Request, Response, Router } from "express";
import { teacherController } from "../controller/teacher";
import { PARAM_ID, VALIDATE_TEACHER, BODY_VALIDATION_TEACHER} from "../middleware/validators";
import havePermission from "../middleware/havePermission";

const CREATE_VALIDATORS = [VALIDATE_TEACHER, BODY_VALIDATION_TEACHER]
const UPDATE_VALIDATORS = [PARAM_ID, VALIDATE_TEACHER, BODY_VALIDATION_TEACHER]

export const TeacherRouter = Router();

TeacherRouter.get('/pending-transfer', havePermission, (req, res) => {

  teacherController.getRequestedStudentTransfers(req)
    .then(r => res.status(r.status).json(r))
    .catch(e => res.status(e.status).json(e))
})

TeacherRouter.get('/form', havePermission, (req, res) => {

  teacherController.teacherForm(req)
    .then(r => res.status(r.status).json(r))
    .catch(e => res.status(e.status).json(e))
})

TeacherRouter.get('/', havePermission, (req, res) => {

  teacherController.findAllWhere({}, req)
    .then(r => res.status(r.status).json(r))
    .catch(e => res.status(e.status).json(e))
})

TeacherRouter.get('/:id', PARAM_ID, havePermission, (req, res) => {

  teacherController.findOneById(req.params.id, req)
    .then(r => res.status(r.status).json(r))
    .catch(e => res.status(e.status).json(e))
})

TeacherRouter.post('/', ...CREATE_VALIDATORS, havePermission, async (req: Request, res: Response) => {
  const response = await teacherController.saveTeacher(req.body); return res.status(response.status as number).json(response)
});

TeacherRouter.put('/:id', ...UPDATE_VALIDATORS, havePermission, (req: Request, res: Response) => {

  teacherController.updateId(req.params.id, req.body)
    .then(r => res.status(r.status).json(r))
    .catch(e => res.status(e.status).json(e))
});

TeacherRouter.delete('/:id', PARAM_ID, havePermission, (req, res) => {

  teacherController.deleteId(req.params.id)
    .then(r => res.status(r.status).json(r))
    .catch(e => res.status(e.status).json(e))
});

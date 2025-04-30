import { Request, Router } from "express";
import { teacherController as controller } from "../controller/teacher";
import { ID_PARAM, VALIDATE_TEACHER, BODY_VALIDATION_TEACHER} from "../middleware/validators";
import havePermission from "../middleware/havePermission";

const CREATE_VALIDATORS = [VALIDATE_TEACHER, BODY_VALIDATION_TEACHER]
const UPDATE_VALIDATORS = [ID_PARAM, VALIDATE_TEACHER, BODY_VALIDATION_TEACHER]

export const TeacherRouter = Router();

TeacherRouter.get('/pending-transfer', havePermission, async (req: Request, res: any) => {
  const response = await controller.getRequestedStudentTransfers(req); return res.status(response.status).json(response)
})

TeacherRouter.get('/form', havePermission, async (req: Request, res: any) => {
  const response = await controller.teacherForm(req); return res.status(response.status).json(response)
})

TeacherRouter.get('/', havePermission, async (req: Request, res: any) => {
  const response = await controller.findAllWhereTeacher(req); return res.status(response.status).json(response)
})

TeacherRouter.get('/:id', ID_PARAM, havePermission, async (req: Request, res: any) => {
  const response = await controller.findOneTeacher(req.params.id, req); return res.status(response.status).json(response)
})

TeacherRouter.post('/', ...CREATE_VALIDATORS, havePermission, async (req: Request, res: any) => {
  const response = await controller.saveTeacher(req.body); return res.status(response.status as number).json(response)
});

TeacherRouter.put('/:id/single-rel', havePermission, async (req: Request, res: any) => {
  const response = await controller.updateTeacherSingleRel(req.params.id, req.body); return res.status(response.status).json(response)
})

TeacherRouter.put('/:id', ...UPDATE_VALIDATORS, havePermission, async (req: Request, res: any) => {
  const response = await controller.updateTeacher(req.params.id, req.body); return res.status(response.status).json(response)
})

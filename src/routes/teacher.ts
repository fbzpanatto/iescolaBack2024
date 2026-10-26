import { Request, Router, Response } from "express";
import { teacherController as controller } from "../controller/teacher";
import { ID_PARAM, VALIDATE_TEACHER, BODY_VALIDATION_TEACHER} from "../middleware/validators";
import havePermission from "../middleware/havePermission";
import { sendResponse } from "../utils/sendResponse";

const CREATE_VALIDATORS = [VALIDATE_TEACHER, BODY_VALIDATION_TEACHER]
const UPDATE_VALIDATORS = [ID_PARAM, VALIDATE_TEACHER, BODY_VALIDATION_TEACHER]

export const TeacherRouter = Router();

TeacherRouter.get('/pending-transfer', havePermission, async (req: Request, res: Response) => {
  const response = await controller.getRequestedStudentTransfers(req, req.user); return sendResponse(res, response)
})

TeacherRouter.get('/form', havePermission, async (req: Request, res: Response) => {
  const response = await controller.teacherForm(req, req.user); return sendResponse(res, response)
})

TeacherRouter.get('/', havePermission, async (req: Request, res: Response) => {
  const response = await controller.findAllWhereTeacher(req, req.user); return sendResponse(res, response)
})

TeacherRouter.get('/:id', ID_PARAM, havePermission, async (req: Request<{ id: string }>, res: Response) => {
  const response = await controller.findOneTeacher(req.params.id, req, req.user); return sendResponse(res, response)
})

TeacherRouter.post('/', ...CREATE_VALIDATORS, havePermission, async (req: Request, res: Response) => {
  const response = await controller.saveTeacher(req.body, req.user); return sendResponse(res, response)
});

TeacherRouter.put('/:id/single-rel', havePermission, async (req: Request<{ id: string }>, res: Response) => {
  const response = await controller.updateTeacherSingleRel(req.params.id, req.body, req.user); return sendResponse(res, response)
})

TeacherRouter.put('/:id', ...UPDATE_VALIDATORS, havePermission, async (req: Request<{ id: string }>, res: Response) => {
  const response = await controller.updateTeacher(req.params.id, req.body, req.user); return sendResponse(res, response)
})

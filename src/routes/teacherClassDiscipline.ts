import { Request, Router, Response } from "express";
import { teacherRelationController } from "../controller/teacherClassDiscipline";
import { ID_PARAM}  from "../middleware/validators";
import { sendResponse } from "../utils/sendResponse";

export const TeacherClassDisciplineRouter = Router();

TeacherClassDisciplineRouter.get('/', async (req: Request, res: Response) => {
  const response = await teacherRelationController.findAllWhere({}); return sendResponse(res, response)
})

TeacherClassDisciplineRouter.get('/:id', ID_PARAM, async (req: Request<{ id: string }>, res: Response) => {
  const response = await teacherRelationController.findOneById(req.params.id, req); return sendResponse(res, response)
})

TeacherClassDisciplineRouter.post('/', async (req: Request, res: Response) => {
  const response = await teacherRelationController.save(req.body, {}); return sendResponse(res, response)
});

TeacherClassDisciplineRouter.put('/contract/:id', ID_PARAM, async (req: Request, res: Response) => {
  const response = await teacherRelationController.updateContract(req.body, req.user); return sendResponse(res, response)
});

TeacherClassDisciplineRouter.put('/:id', ID_PARAM, async (req: Request<{ id: string }>, res: Response) => {
  const response = await teacherRelationController.updateId(req.params.id, req.body); return sendResponse(res, response)
});
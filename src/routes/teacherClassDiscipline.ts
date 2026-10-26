import { Request, Router, Response } from "express";
import { teacherRelationController } from "../controller/teacherClassDiscipline";
import { ID_PARAM}  from "../middleware/validators";

export const TeacherClassDisciplineRouter = Router();

TeacherClassDisciplineRouter.get('/', async (req: Request, res: Response) => {
  const response = await teacherRelationController.findAllWhere({}); return res.status(response.status).json(response)
})

TeacherClassDisciplineRouter.get('/:id', ID_PARAM, async (req: Request<{ id: string }>, res: Response) => {
  const response = await teacherRelationController.findOneById(req.params.id, req); return res.status(response.status).json(response)
})

TeacherClassDisciplineRouter.post('/', async (req: Request, res: Response) => {
  const response = await teacherRelationController.save(req.body, {}); return res.status(response.status).json(response)
});

TeacherClassDisciplineRouter.put('/contract/:id', ID_PARAM, async (req: Request, res: Response) => {
  const response = await teacherRelationController.updateContract(req.body, req.user); return res.status(response.status).json(response)
});

TeacherClassDisciplineRouter.put('/:id', ID_PARAM, async (req: Request<{ id: string }>, res: Response) => {
  const response = await teacherRelationController.updateId(req.params.id, req.body); return res.status(response.status).json(response)
});
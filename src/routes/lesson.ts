import { Router, Request } from "express"
import { lessonController as controller } from "../controller/lesson";
import havePermission from "../middleware/havePermission";

export const LessonRouter = Router();

LessonRouter.get('/form', havePermission, async (req: Request, res: any) => {
  const response = await controller.getFormData(req); return res.status(response.status).json(response)
});

LessonRouter.get('/all', havePermission, async (req: Request, res: any) => {
  const response = await controller.getAllLessons(req); return res.status(response.status).json(response)
});

LessonRouter.get('/:id', havePermission, async (req: Request, res: any) => {
  const response = await controller.getLesson(req); return res.status(response.status).json(response)
});

LessonRouter.post('/', havePermission, async (req: Request, res: any) => {
  const response = await controller.saveLesson(req.body); return res.status(response.status).json(response)
});

LessonRouter.put('/:id', havePermission, async (req: Request, res: any) => {
  const response = await controller.updateLesson(req); return res.status(response.status).json(response)
});

LessonRouter.put('/:id/execution', havePermission, async (req: Request, res: any) => {
  const response = await controller.saveLessonExecution(req); return res.status(response.status).json(response)
});
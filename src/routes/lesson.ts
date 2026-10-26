import { Router, Request, Response } from "express"
import { lessonController as controller } from "../controller/lesson";
import havePermission from "../middleware/havePermission";
import { sendResponse } from "../utils/sendResponse";

export const LessonRouter = Router();

LessonRouter.get('/form', havePermission, async (req: Request, res: Response) => {
  const response = await controller.getFormData(req); return sendResponse(res, response)
});

LessonRouter.get('/all', havePermission, async (req: Request, res: Response) => {
  const response = await controller.getAllLessons(req); return sendResponse(res, response)
});

LessonRouter.get('/:id', havePermission, async (req: Request, res: Response) => {
  const response = await controller.getLesson(req); return sendResponse(res, response)
});

LessonRouter.post('/', havePermission, async (req: Request, res: Response) => {
  const response = await controller.saveLesson(req.body, req.user); return sendResponse(res, response)
});

LessonRouter.put('/:id', havePermission, async (req: Request, res: Response) => {
  const response = await controller.updateLesson(req, req.user); return sendResponse(res, response)
});

LessonRouter.put('/:id/execution', havePermission, async (req: Request, res: Response) => {
  const response = await controller.saveLessonExecution(req, req.user); return sendResponse(res, response)
});
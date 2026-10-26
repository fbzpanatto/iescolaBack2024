import { Router, Request, Response } from "express";
import { teacherClassroomsController as controller } from "../controller/teacherClassrooms";
import { sendResponse } from "../utils/sendResponse";

export const TeacherClassroomsRouter = Router();

TeacherClassroomsRouter.get('/', async (req: Request, res: Response) => {
  const response = await controller.getAllTClass(req, req.user); return sendResponse(res, response)
});

TeacherClassroomsRouter.post('/', async (req: Request, res: Response) => {
  const response = await controller.save(req.body); return sendResponse(res, response)
})

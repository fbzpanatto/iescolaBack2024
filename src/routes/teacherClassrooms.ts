import { Router, Request, Response } from "express";
import { teacherClassroomsController as controller } from "../controller/teacherClassrooms";

export const TeacherClassroomsRouter = Router();

TeacherClassroomsRouter.get('/', async (req: Request, res: Response) => {
  const response = await controller.getAllTClass(req, req.user); return res.status(response.status).json(response)
});

TeacherClassroomsRouter.post('/', async (req: Request, res: Response) => {
  const response = await controller.save(req.body); return res.status(response.status).json(response)
})

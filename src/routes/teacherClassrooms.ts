import { Router, Request } from "express";
import { teacherClassroomsController as controller } from "../controller/teacherClassrooms";

export const TeacherClassroomsRouter = Router();

TeacherClassroomsRouter.get('/', async (req: Request, res: any) => {
  const response = await controller.getAllTClass(req); return res.status(response.status).json(response)
});

TeacherClassroomsRouter.post('/', async (req: Request, res: any) => {
  const response = await controller.save(req.body); return res.status(response.status).json(response)
})

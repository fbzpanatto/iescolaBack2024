import { Router } from "express";
import { teacherClassroomsController } from "../controller/teacherClassrooms";

export const TeacherClassroomsRouter = Router();

TeacherClassroomsRouter.get('/', async (req, res) => {
  const response = await teacherClassroomsController.getAllTClass(req); return res.status(response.status as number).json(response)
});

TeacherClassroomsRouter.post('/', async (req, res) => {
  const response = await teacherClassroomsController.save(req.body); return res.status(response.status as number).json(response)
})

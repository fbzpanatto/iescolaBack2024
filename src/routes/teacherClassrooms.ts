import { Router } from "express";
import { teacherClassroomsController } from "../controller/teacherClassrooms";

export const TeacherClassroomsRouter = Router();

TeacherClassroomsRouter.get('/', (req, res) => {

  teacherClassroomsController.findAllWhere({}, req)
    .then(r => res.status(r.status).json(r))
    .catch(e => res.status(e.status).json(e))
});

TeacherClassroomsRouter.post('/', (req, res) => {

  teacherClassroomsController.save(req.body)
    .then(r => res.status(r.status).json(r))
    .catch(e => res.status(e.status).json(e))
});

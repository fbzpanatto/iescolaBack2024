import { Router } from "express";
import { teacherController } from "../controller/teacher";
import havePermission from "../middleware/havePermission";

export const TeacherRouter = Router();

TeacherRouter.get('/pending-transfer', havePermission, (req, res) => {

  teacherController.getRequestedStudentTransfers(req)
    .then(r => res.status(r.status).json(r))
    .catch(e => res.status(e.status).json(e))
})

TeacherRouter.get('/', havePermission, (req, res) => {

  teacherController.findAllWhere({}, req)
    .then(r => res.status(r.status).json(r))
    .catch(e => res.status(e.status).json(e))
})

TeacherRouter.get('/:id', havePermission, (req, res) => {

  teacherController.findOneById(req.params.id, req)
    .then(r => res.status(r.status).json(r))
    .catch(e => res.status(e.status).json(e))
})

TeacherRouter.post('/', havePermission, (req, res) => {

  teacherController.save(req.body, {})
    .then(r => res.status(r.status).json(r))
    .catch(e => res.status(e.status).json(e))
});

TeacherRouter.put('/:id', havePermission, (req, res) => {

  teacherController.updateId(req.params.id, req.body)
    .then(r => res.status(r.status).json(r))
    .catch(e => res.status(e.status).json(e))
});

TeacherRouter.delete('/:id', havePermission, (req, res) => {

  teacherController.deleteId(req.params.id)
    .then(r => res.status(r.status).json(r))
    .catch(e => res.status(e.status).json(e))
});

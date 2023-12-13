import { Router } from "express";
import { studentController } from "../controller/student";
import havePermission from "../middleware/havePermission";

export const StudentRouter = Router();

StudentRouter.get('/inactive/:year', havePermission, (req, res) => {

  studentController.getAllInactivates(req)
    .then(r => res.status(r.status).json(r))
    .catch(e => res.status(e.status).json(e))
})

StudentRouter.post('/inactive', havePermission, (req, res) => {

  studentController.setInactiveNewClassroom(req.body)
    .then(r => res.status(r.status).json(r))
    .catch(e => res.status(e.status).json(e))
})

StudentRouter.get('/:year/all', havePermission, (req, res) => {

  studentController.findAllWhere({}, req)
    .then(r => res.status(r.status).json(r))
    .catch(e => res.status(e.status).json(e))
})

StudentRouter.get('/:id', havePermission, (req, res) => {

  studentController.findOneById(req.params.id, req.body)
    .then(r => res.status(r.status).json(r))
    .catch(e => res.status(e.status).json(e))
})

StudentRouter.post('/', havePermission, (req, res) => {

  studentController.save(req.body)
    .then(r => res.status(r.status).json(r))
    .catch(e => res.status(e.status).json(e))
});

StudentRouter.put('/literacy-first/:id', havePermission, (req, res) => {

  studentController.putLiteracyBeforeLevel(req.body)
    .then(r => res.status(r.status).json(r))
    .catch(e => res.status(e.status).json(e))
});

StudentRouter.put('/:id/graduate', havePermission, (req, res) => {

  studentController.graduate(req.params.id, req.body)
    .then(r => res.status(r.status).json(r))
    .catch(e => res.status(e.status).json(e))
});

StudentRouter.put('/:id', havePermission, (req, res) => {

  studentController.updateId(req.params.id, req.body)
    .then(r => res.status(r.status).json(r))
    .catch(e => res.status(e.status).json(e))
});

StudentRouter.delete('/:id', havePermission, (req, res) => {

  studentController.deleteId(req.params.id)
    .then(r => res.status(r.status).json(r))
    .catch(e => res.status(e.status).json(e))
});

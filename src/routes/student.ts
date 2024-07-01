import { Router, Request, Response } from "express";
import { studentController } from "../controller/student";
import { VALIDATE_ID, VALIDATE_USER, BODY_VALIDATION_USER, VALIDATE_YEAR_NAME } from "../middleware/validators";
import havePermission from "../middleware/havePermission";

const CREATE_VALIDATORS = [VALIDATE_USER, BODY_VALIDATION_USER]
const UPDATE_VALIDATORS = [VALIDATE_ID, VALIDATE_USER, BODY_VALIDATION_USER]

export const StudentRouter = Router();

StudentRouter.get('/inactive/:year', VALIDATE_YEAR_NAME, havePermission, (req, res) => {

  studentController.getAllInactivates(req)
    .then(r => res.status(r.status).json(r))
    .catch(e => res.status(e.status).json(e))
})

StudentRouter.post('/inactive', havePermission, (req, res) => {

  studentController.setInactiveNewClassroom(req.body)
    .then(r => res.status(r.status).json(r))
    .catch(e => res.status(e.status).json(e))
})

StudentRouter.get('/:year/all', VALIDATE_YEAR_NAME, havePermission, (req, res) => {

  studentController.findAllWhere({}, req)
    .then(r => res.status(r.status).json(r))
    .catch(e => res.status(e.status).json(e))
})

StudentRouter.get('/:id', VALIDATE_ID, havePermission, (req, res) => {

  studentController.findOneById(req.params.id, req.body)
    .then(r => res.status(r.status).json(r))
    .catch(e => res.status(e.status).json(e))
})

StudentRouter.post('/', ...CREATE_VALIDATORS, havePermission, (req: Request, res: Response) => {

  studentController.save(req.body)
    .then(r => res.status(r.status).json(r))
    .catch(e => res.status(e.status).json(e))
});

StudentRouter.put('/literacy-first/:id', VALIDATE_ID, havePermission, (req, res) => {

  studentController.putLiteracyBeforeLevel(req.body)
    .then(r => res.status(r.status).json(r))
    .catch(e => res.status(e.status).json(e))
});

StudentRouter.put('/:id/graduate', VALIDATE_ID, havePermission, (req, res) => {

  studentController.graduate(req.params.id, req.body)
    .then(r => res.status(r.status).json(r))
    .catch(e => res.status(e.status).json(e))
});

StudentRouter.put('/:id', ...UPDATE_VALIDATORS, havePermission, (req: Request, res: Response) => {

  studentController.updateId(req.params.id, req.body)
    .then(r => res.status(r.status).json(r))
    .catch(e => res.status(e.status).json(e))
});

StudentRouter.delete('/:id', VALIDATE_ID, havePermission, (req, res) => {

  studentController.deleteId(req.params.id)
    .then(r => res.status(r.status).json(r))
    .catch(e => res.status(e.status).json(e))
});

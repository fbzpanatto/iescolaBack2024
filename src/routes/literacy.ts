import { Router } from "express";
import { literacyController } from "../controller/literacy";
import havePermission from "../middleware/havePermission";

export const LiteracyRouter = Router();

LiteracyRouter.get('/:year', havePermission, (req, res) => {

  literacyController.getClassrooms(req)
    .then(r => res.status(r.status).json(r))
    .catch(e => res.status(e.status).json(e))
})

LiteracyRouter.get('/:id/:year/classroom', havePermission, (req, res) => {

  literacyController.getStudentClassrooms(req)
    .then(r => res.status(r.status).json(r))
    .catch(e => res.status(e.status).json(e))
})

LiteracyRouter.get('/:id/:year/totals', havePermission, (req, res) => {

  literacyController.getTotals(req)
    .then(r => res.status(r.status).json(r))
    .catch(e => res.status(e.status).json(e))
})

LiteracyRouter.put('/:id/classroom', havePermission, (req, res) => {

  literacyController.updateLiteracy(req.body)
    .then(r => res.status(r.status).json(r))
    .catch(e => res.status(e.status).json(e))
})

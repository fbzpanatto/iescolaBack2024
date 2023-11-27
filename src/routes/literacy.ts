import { Router } from "express";
import { literacyController } from "../controller/literacy";
import havePermission from "../middleware/havePermission";

export const LiteracyRouter = Router();

LiteracyRouter.get('/', havePermission, (req, res) => {

  literacyController.getClassrooms(req)
    .then(r => res.status(r.status).json(r))
    .catch(e => res.status(e.status).json(e))
})

// LiteracyRouter.get('/classroom/:id', havePermission, (req, res) => {
//
//   literacyController.getStudentClassrooms(req)
//     .then(r => res.status(r.status).json(r))
//     .catch(e => res.status(e.status).json(e))
// })

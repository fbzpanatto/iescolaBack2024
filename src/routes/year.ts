import { Router, Request, Response } from 'express'
import { yearController } from "../controller/year";
import { PARAM_ID, VALIDATE_YEAR, BODY_VALIDATION_YEAR } from "../middleware/validators";
import havePermission from "../middleware/havePermission";

const CREATE_VALIDATORS = [VALIDATE_YEAR, BODY_VALIDATION_YEAR]
const UPDATE_VALIDATORS = [PARAM_ID, VALIDATE_YEAR, BODY_VALIDATION_YEAR]

export const YearRouter = Router();

YearRouter.get('/', havePermission, (req: Request, res: Response) => {

  yearController.findAllWhere({}, req)
    .then(r => res.status(r.status).json(r))
    .catch(e => res.status(e.status).json(e))
})

YearRouter.get('/:id', PARAM_ID, havePermission, (req: Request, res: Response) => {

  yearController.findOneById(req.params.id, req.body)
    .then(r => res.status(r.status).json(r))
    .catch(e => res.status(e.status).json(e))
})

YearRouter.post('/', ...CREATE_VALIDATORS, havePermission, (req: Request, res: Response) => {

  yearController.save(req.body, {})
    .then(r => res.status(r.status).json(r))
    .catch(e => res.status(e.status).json(e))
});

YearRouter.put('/:id', ...UPDATE_VALIDATORS, havePermission, (req: Request, res: Response) => {

  yearController.updateId(req.params.id, req.body)
    .then(r => res.status(r.status).json(r))
    .catch(e => res.status(e.status).json(e))
});

YearRouter.delete('/:id', PARAM_ID, havePermission, (req: Request, res: Response) => {

  yearController.deleteId(req.params.id)
    .then(r => res.status(r.status).json(r))
    .catch(e => res.status(e.status).json(e))
});

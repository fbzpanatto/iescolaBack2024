import { Router } from "express";
import { yearController } from "../controller/year";

export const YearRouter = Router();

YearRouter.get('/', (req, res) => {

  yearController.findAllWhere({})
    .then(r => res.status(r.status).json(r))
    .catch(e => res.status(e.status).json(e))
})

YearRouter.get('/:id', (req, res) => {

  yearController.findOneById(req.params.id)
    .then(r => res.status(r.status).json(r))
    .catch(e => res.status(e.status).json(e))
})

YearRouter.post('/', (req, res) => {

  yearController.save(req.body, {})
    .then(r => res.status(r.status).json(r))
    .catch(e => res.status(e.status).json(e))
});

YearRouter.put('/:id', (req, res) => {

  yearController.updateId(req.params.id, req.body)
    .then(r => res.status(r.status).json(r))
    .catch(e => res.status(e.status).json(e))
});

YearRouter.delete('/:id', (req, res) => {

  yearController.deleteId(req.params.id)
    .then(r => res.status(r.status).json(r))
    .catch(e => res.status(e.status).json(e))
});

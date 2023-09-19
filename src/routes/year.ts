import { Router } from "express";
import { yearController } from "../controller/year";

export const YearRouter = Router();

YearRouter.get('/', (req, res) => {

  yearController.getAllWhere({})
    .then(r => res.status(r.status).json({ method: req.method, resource: req.baseUrl, payload: r.data }))
    .catch(e => res.status(e.status).json({ method: req.method, resource: req.baseUrl, payload: e.data }))
})

YearRouter.get('/:id', (req, res) => {

  yearController.getOneWhere({
    where: { id: Number(req.params.id) }
  })
    .then(r => res.status(r.status).json({ method: req.method, resource: req.baseUrl, payload: r.data }))
    .catch(e => res.status(e.status).json({ method: req.method, resource: req.baseUrl, payload: e.data }))
})

YearRouter.post('/', (req, res) => {

  yearController.saveData(req.body, {})
    .then(r => res.status(r.status).json({ method: req.method, resource: req.baseUrl, payload: r.data }))
    .catch(e => res.status(e.status).json({ method: req.method, resource: req.baseUrl, payload: e.data }))
});

YearRouter.put('/:id', (req, res) => {

  yearController.updateOneById(req.params.id, req.body)
    .then(r => res.status(r.status).json({ method: req.method, resource: req.baseUrl, payload: r }))
    .catch(e => res.status(e.status).json({ method: req.method, resource: req.baseUrl, payload: e.data }))
});

YearRouter.delete('/:id', (req, res) => {

  yearController.deleteOneById(req.params.id)
    .then(r => res.status(r.status).json({ method: req.method, resource: req.baseUrl, payload: r }))
    .catch(e => res.status(e.status).json({ method: req.method, resource: req.baseUrl, payload: e.data }))
});

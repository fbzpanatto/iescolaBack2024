import { Router } from "express";
import { bimesterController } from "../controller/bimester";

export const BimesterRouter = Router();

BimesterRouter.get('/', (req, res) => {

  bimesterController.getAllWhere({})
    .then(r => res.status(r.status).json({ method: req.method, resource: req.baseUrl, payload: r.data }))
    .catch(e => res.status(e.status).json({ method: req.method, resource: req.baseUrl, payload: e.data }))
})

BimesterRouter.get('/:id', (req, res) => {

  bimesterController.getOneWhere({
    where: { id: Number(req.params.id) }
  })
    .then(r => res.status(r.status).json({ method: req.method, resource: req.baseUrl, payload: r.data }))
    .catch(e => res.status(e.status).json({ method: req.method, resource: req.baseUrl, payload: e.data }))
})

BimesterRouter.post('/', (req, res) => {

  bimesterController.save(req.body, {})
    .then(r => res.status(r.status).json({ method: req.method, resource: req.baseUrl, payload: r.data }))
    .catch(e => res.status(e.status).json({ method: req.method, resource: req.baseUrl, payload: e.data }))
});

BimesterRouter.put('/:id', (req, res) => {

  bimesterController.updateId(req.params.id, req.body)
    .then(r => res.status(r.status).json({ method: req.method, resource: req.baseUrl, payload: r }))
    .catch(e => res.status(e.status).json({ method: req.method, resource: req.baseUrl, payload: e.data }))
});

BimesterRouter.delete('/:id', (req, res) => {

  bimesterController.deleteId(req.params.id)
    .then(r => res.status(r.status).json({ method: req.method, resource: req.baseUrl, payload: r }))
    .catch(e => res.status(e.status).json({ method: req.method, resource: req.baseUrl, payload: e.data }))
});

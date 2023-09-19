import { Router } from "express";
import { bimesterController } from "../controller/bimester";

export const BimesterRouter = Router();

BimesterRouter.get('/', (req, res) => {

  const { active, order } = req.query

  bimesterController.getAllWhere({
    // where: { active: active === 'true' },
    // order: { name: order === 'desc' ? 'DESC' : 'ASC' }
  })
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

  bimesterController.saveData(req.body, {})
    .then(r => res.status(r.status).json({ method: req.method, resource: req.baseUrl, payload: r.data }))
    .catch(e => res.status(e.status).json({ method: req.method, resource: req.baseUrl, payload: e.data }))
});

BimesterRouter.put('/:id', (req, res) => {

  bimesterController.updateOneById(req.params.id, req.body)
    .then(r => res.status(r.status).json({ method: req.method, resource: req.baseUrl, payload: r }))
    .catch(e => res.status(e.status).json({ method: req.method, resource: req.baseUrl, payload: e.data }))
});

BimesterRouter.delete('/:id', (req, res) => {

  bimesterController.deleteOneById(req.params.id)
    .then(r => res.status(r.status).json({ method: req.method, resource: req.baseUrl, payload: r }))
    .catch(e => res.status(e.status).json({ method: req.method, resource: req.baseUrl, payload: e.data }))
});

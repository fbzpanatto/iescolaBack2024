import { Router, Response, Request } from "express";
import { personController } from "../controller/person";

export const PersonRouter = Router();

PersonRouter.get('/', async (req: Request, res: Response) => { const response = await personController.findAllWhere({}); return res.status(response.status as number).json(response)})

PersonRouter.get('/:id', async (req: Request, res: Response) => { const response = await personController.findOneById(req.params.id, req); return res.status(response.status as number).json(response) })

PersonRouter.post('/', async (req: Request, res: Response) => { const response = await personController.save(req.body, {}); return res.status(response.status as number).json(response) });

PersonRouter.put('/:id', async (req: Request, res: Response) => { const response = await personController.updateId(req.params.id, req.body); return res.status(response.status as number).json(response) });

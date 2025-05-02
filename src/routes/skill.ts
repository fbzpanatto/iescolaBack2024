import { Router, Request } from "express";
import { skillController as controller } from "../controller/skill";
import { ID_PARAM } from "../middleware/validators";

export const SkillRouter = Router();

SkillRouter.get('/', async (req: Request, res: any) => {
  const response = await controller.findAllWhere({}, req); return res.status(response.status).json(response)
})

SkillRouter.get('/:id', ID_PARAM, async (req: Request, res: any) => {
  const response = await controller.findOneById(req.params?.id, req); return res.status(response.status).json(response)
})

SkillRouter.post('/', async (req: Request, res: any) => {
  const response = await controller.save(req.body, {}); return res.status(response.status).json(response)
});

SkillRouter.put('/:id', ID_PARAM, async (req: Request, res: any) => {
  const response = await controller.updateId(req.params?.id, req.body); return res.status(response.status).json(response)
})
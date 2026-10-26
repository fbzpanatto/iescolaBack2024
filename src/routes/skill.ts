import { Router, Request, Response } from "express";
import { skillController as controller } from "../controller/skill";
import { ID_PARAM } from "../middleware/validators";
import { sendResponse } from "../utils/sendResponse";

export const SkillRouter = Router();

SkillRouter.get('/', async (req: Request, res: Response) => {
  const response = await controller.findAllWhere({}, req); return sendResponse(res, response)
})

SkillRouter.get('/:id', ID_PARAM, async (req: Request<{ id: string }>, res: Response) => {
  const response = await controller.findOneById(req.params?.id, req); return sendResponse(res, response)
})

SkillRouter.post('/', async (req: Request, res: Response) => {
  const response = await controller.save(req.body, {}); return sendResponse(res, response)
});

SkillRouter.put('/:id', ID_PARAM, async (req: Request<{ id: string }>, res: Response) => {
  const response = await controller.updateId(req.params?.id, req.body); return sendResponse(res, response)
})
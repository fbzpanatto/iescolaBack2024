import { Request, Router } from "express";
import { trainingController } from "../controller/training";
import { BODY_VALIDATION_TRAINING, ID_PARAM, VALIDATE_TRAINING } from "../middleware/validators";
import havePermission from "../middleware/havePermission";

const CREATE_VALIDATORS = [VALIDATE_TRAINING, BODY_VALIDATION_TRAINING];
const UPDATE_VALIDATORS = [ID_PARAM, VALIDATE_TRAINING, BODY_VALIDATION_TRAINING];

export const TrainingRouter = Router();

TrainingRouter.get('/form', havePermission, async (req: Request, res: any) => {
  const response = await trainingController.trainingForm(req)
  return res.status(response.status as number).json(response)
})

TrainingRouter.get('/presence', havePermission, async (req: Request, res: any) => {
  const response = await trainingController.presence(req)
  return res.status(response.status as number).json(response)
})

TrainingRouter.get('/identifier/:id', havePermission, async (req: Request, res: any) => {
  const response = await trainingController.getOne(req)
  return res.status(response.status as number).json(response)
})

TrainingRouter.get('/:year', havePermission, async (req: Request, res: any) => {
  const response = await trainingController.getAll(req)
  return res.status(response.status as number).json(response)
})

TrainingRouter.post('/', ...CREATE_VALIDATORS, havePermission, async (req: Request, res: any) => {
  const response = await trainingController.saveTraining(req.body)
  return res.status(response.status as number).json(response)
})

TrainingRouter.put('/teacher-presence/:id', havePermission, async (req: Request, res: any) => {
  const response = await trainingController.updateTeacherTraining(req.body)
  return res.status(response.status as number).json(response)
})

TrainingRouter.put('/:id', ...UPDATE_VALIDATORS, havePermission, async (req: Request, res: any) => {
  const response = await trainingController.updateTraining(req.params.id, req.body)
  return res.status(response.status as number).json(response)
})
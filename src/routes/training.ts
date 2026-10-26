import { Request, Router, Response } from "express";
import { trainingController } from "../controller/training";
import { BODY_VALIDATION_TRAINING, ID_PARAM, VALIDATE_TRAINING } from "../middleware/validators";
import havePermission from "../middleware/havePermission";
import { sendResponse } from "../utils/sendResponse";

const CREATE_VALIDATORS = [VALIDATE_TRAINING, BODY_VALIDATION_TRAINING];
const UPDATE_VALIDATORS = [ID_PARAM, VALIDATE_TRAINING, BODY_VALIDATION_TRAINING];

export const TrainingRouter = Router();

TrainingRouter.get('/form', havePermission, async (req: Request, res: Response) => {
  const response = await trainingController.trainingForm(req)
  return sendResponse(res, response)
})

TrainingRouter.get('/presence', havePermission, async (req: Request, res: Response) => {
  const response = await trainingController.presenceTeachersByCategory(req, req.user)
  return sendResponse(res, response)
})

TrainingRouter.get('/identifier/:id', havePermission, async (req: Request<{ id: string }>, res: Response) => {
  const response = await trainingController.getOne(req)
  return sendResponse(res, response)
})

TrainingRouter.get('/:year', havePermission, async (req: Request<{ year: string }>, res: Response) => {
  const response = await trainingController.getAll(req)
  return sendResponse(res, response)
})

TrainingRouter.post('/', ...CREATE_VALIDATORS, havePermission, async (req: Request, res: Response) => {
  const response = await trainingController.saveTraining(req.body, req.user)
  return sendResponse(res, response)
})

TrainingRouter.put('/teacher-presence/status/:id', havePermission, async (req: Request, res: Response) => {
  const response = await trainingController.updateTeacherTrainingStatus(req.body, req.user)
  return sendResponse(res, response)
})

TrainingRouter.put('/teacher-presence/observation/:id', havePermission, async (req: Request, res: Response) => {
  const response = await trainingController.updateTeacherTrainingObservation(req.body, req.user)
  return sendResponse(res, response)
})

TrainingRouter.put('/:id', ...UPDATE_VALIDATORS, havePermission, async (req: Request<{ id: string }>, res: Response) => {
  const response = await trainingController.updateTraining(req.params.id, req.body, req.user)
  return sendResponse(res, response)
})
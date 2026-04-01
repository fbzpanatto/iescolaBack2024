import { Router, Request } from "express";
import { classroomController as controller } from "../controller/classroom";
import { ID_PARAM, REQUEST_CLASSROOM_QUERY} from "../middleware/validators";

export const ClassroomRouter = Router();

ClassroomRouter.get('/form', async (req: Request, res: any) => { const response = await controller.classroomForm(req); return res.status(response.status).json(response)})

ClassroomRouter.get('/', REQUEST_CLASSROOM_QUERY, async (req: Request, res: any) => { const response = await controller.getAllClassrooms(req); return res.status(response.status).json(response)})

ClassroomRouter.get('/:id', ID_PARAM, async (req: Request, res: any) => { const response = await controller.getClassroom(req); return res.status(response.status).json(response)})

ClassroomRouter.post('/', async (req: Request, res: any) => { const response = await controller.save(req.body, {}); return res.status(response.status).json(response)})

ClassroomRouter.put('/:id', ID_PARAM, async (req: Request<{ id: number | string }>, res: any) => { const response = await controller.updateId(req.params.id, req.body); return res.status(response.status).json(response)})
import { Router, Request } from "express";
import { classroomController as controller } from "../controller/classroom";
import { ID_PARAM, REQUEST_CLASSROOM_QUERY} from "../middleware/validators";
import havePermission from "../middleware/havePermission";

export const ClassroomRouter = Router();

ClassroomRouter.get('/form', havePermission, async (req: Request, res: any) => { const response = await controller.classroomForm(req); return res.status(response.status).json(response)})

ClassroomRouter.get('/', havePermission, REQUEST_CLASSROOM_QUERY, async (req: Request, res: any) => { const response = await controller.getAllClassrooms(req); return res.status(response.status).json(response)})

ClassroomRouter.get('/:id', havePermission, ID_PARAM, async (req: Request, res: any) => { const response = await controller.getClassroom(req); return res.status(response.status).json(response)})

ClassroomRouter.post('/', havePermission, async (req: Request, res: any) => { const response = await controller.save(req.body, {}); return res.status(response.status).json(response)})

ClassroomRouter.put('/:id', havePermission, ID_PARAM, async (req: Request, res: any) => { const response = await controller.putClassroomAndStudents(req); return res.status(response.status).json(response)})
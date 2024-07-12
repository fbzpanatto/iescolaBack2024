import { Request, Response, Router } from "express";
import { studentController } from "../controller/student";
import { BODY_VALIDATION_USER, VALIDATE_ID, VALIDATE_USER, VALIDATE_YEAR_NAME } from "../middleware/validators";
import havePermission from "../middleware/havePermission";

const CREATE_VALIDATORS = [VALIDATE_USER, BODY_VALIDATION_USER];
const UPDATE_VALIDATORS = [VALIDATE_ID, VALIDATE_USER, BODY_VALIDATION_USER];

export const StudentRouter = Router();

StudentRouter.get("/form", havePermission, (req, res) => {
  studentController.studentForm(req)
    .then((r) => res.status(r.status).json(r))
    .catch((e) => res.status(e.status).json(e));
});

StudentRouter.get("/inactive/:year", VALIDATE_YEAR_NAME, havePermission, (req: Request, res: Response) => {
    studentController.getAllInactivates(req)
      .then((r) => res.status(r.status).json(r))
      .catch((e) => res.status(e.status).json(e));
  },
);

StudentRouter.get("/:year/all", VALIDATE_YEAR_NAME, havePermission, (req: Request, res: Response) => {
    studentController.findAllWhere({}, req)
      .then((r) => res.status(r.status).json(r))
      .catch((e) => res.status(e.status).json(e));
  },
);

StudentRouter.get("/:id", VALIDATE_ID, havePermission, (req: Request, res: Response) => {
    studentController.findOneStudentById(req.params.id, req.body)
      .then((r) => res.status(r.status).json(r))
      .catch((e) => res.status(e.status).json(e));
  },
);

StudentRouter.post("/inactive", havePermission, async (req: Request, res: Response) => {
  const response = await studentController.setInactiveNewClassroom(req.body)
  return res.status(response.status as number).json(response)
});

StudentRouter.post("/", ...CREATE_VALIDATORS, havePermission, (req: Request, res: Response) => {
    studentController.save(req.body)
      .then((r) => res.status(r.status).json(r))
      .catch((e) => res.status(e.status).json(e));
  },
);

StudentRouter.put("/literacy-first/:id", VALIDATE_ID, havePermission, (req: Request, res: Response) => {
    studentController.putLiteracyBeforeLevel(req.body)
      .then((r) => res.status(r.status).json(r))
      .catch((e) => res.status(e.status).json(e));
  },
);

StudentRouter.put("/:id/graduate", VALIDATE_ID, havePermission, async (req: Request, res: Response) => {
  const response = await studentController.graduate(req.params.id, req.body)
  return res.status(response?.status as number).json(response)
})

StudentRouter.put("/:id", ...UPDATE_VALIDATORS, havePermission, (req: Request, res: Response) => {
    studentController.updateId(req.params.id, req.body)
      .then((r) => res.status(r.status).json(r))
      .catch((e) => res.status(e.status).json(e));
  },
);

StudentRouter.delete("/:id", VALIDATE_ID, havePermission, (req: Request, res: Response) => {
    studentController.deleteId(req.params.id)
      .then((r) => res.status(r.status).json(r))
      .catch((e) => res.status(e.status).json(e));
  },
);

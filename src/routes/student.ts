import { Request, Response, Router } from "express";
import { studentController } from "../controller/student";
import { BODY_VALIDATION_USER, PARAM_ID, VALIDATE_USER, PARAM_YEAR } from "../middleware/validators";
import havePermission from "../middleware/havePermission";

const CREATE_VALIDATORS = [VALIDATE_USER, BODY_VALIDATION_USER];
const UPDATE_VALIDATORS = [PARAM_ID, VALIDATE_USER, BODY_VALIDATION_USER];

export const StudentRouter = Router();

StudentRouter.get("/form", havePermission, async (req, res) => {
  const response = await studentController.studentForm(req); return res.status(response.status as number).json(response);
});

StudentRouter.get("/inactive/:year", PARAM_YEAR, havePermission, async (req: Request, res: Response) => {
    const response = await studentController.getAllInactivates(req); return res.status(response.status as number).json(response);
  },
);

StudentRouter.get("/:year/all", PARAM_YEAR, havePermission, (req: Request, res: Response) => {
    studentController.findAllWhere({}, req)
      .then((r) => res.status(r.status).json(r))
      .catch((e) => res.status(e.status).json(e));
  },
);

StudentRouter.get("/:id", PARAM_ID, havePermission, (req: Request, res: Response) => {
    studentController.findOneStudentById(req.params.id, req.body)
      .then((r) => res.status(r.status).json(r))
      .catch((e) => res.status(e.status).json(e));
  },
);

StudentRouter.post("/inactive", havePermission, async (req: Request, res: Response) => {
  const response = await studentController.inactiveNewClass(req.body); return res.status(response.status as number).json(response);
})

StudentRouter.post("/", ...CREATE_VALIDATORS, havePermission, async (req: Request, res: Response) => {
    const response = await studentController.save(req.body); return res.status(response.status as number).json(response);
  }
)

StudentRouter.put("/literacy-first/:id", PARAM_ID, havePermission, async (req: Request, res: Response) => {
    const response = await studentController.putLiteracyBeforeLevel(req.body); return res.status(response.status as number).json(response);
  }
)

StudentRouter.put("/:id/graduate", PARAM_ID, havePermission, async (req: Request, res: Response) => {
  const response = await studentController.graduate(req.params.id, req.body); return res.status(response.status as number).json(response);
})

StudentRouter.put("/:id", ...UPDATE_VALIDATORS, havePermission, async (req: Request, res: Response) => {
    const response = await studentController.updateId(req.params.id, req.body); return res.status(response.status as number).json(response);
  },
)
// Sprint endpoints. Reads: any authenticated user. Create/close: Scrum Master.
import { Router } from "express";
import { requireAuth, requireRole } from "../../auth/middleware.js";
import { sameOriginOnly } from "../../middleware/csrf.js";
import { mutationLimiter } from "../../middleware/rateLimit.js";
import { parseBody } from "../../lib/validate.js";
import { param } from "../../lib/http.js";
import { sendData } from "../../lib/response.js";
import { ROLES, DEFAULT_PROJECT_ID } from "../../config/constants.js";
import { CreateSprintSchema } from "./validation.js";
import { listSprints, createSprint, closeSprint } from "./logic.js";

const PID = DEFAULT_PROJECT_ID;
export const sprintRoutes = Router();

sprintRoutes.use(requireAuth);

sprintRoutes.get("/", async (_req, res, next) => {
  try {
    sendData(res, 200, { sprints: await listSprints(PID) });
  } catch (err) {
    next(err);
  }
});

const sm = [sameOriginOnly, requireRole(ROLES.SCRUM_MASTER), mutationLimiter];

sprintRoutes.post("/", ...sm, async (req, res, next) => {
  try {
    const input = parseBody(CreateSprintSchema, req.body);
    const sprint = await createSprint(input, PID, req.user!.id);
    sendData(res, 201, { sprint });
  } catch (err) {
    next(err);
  }
});

sprintRoutes.patch("/:id/close", ...sm, async (req, res, next) => {
  try {
    sendData(res, 200, { sprint: await closeSprint(param(req, "id"), PID) });
  } catch (err) {
    next(err);
  }
});

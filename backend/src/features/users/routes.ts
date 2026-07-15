// GET /users?projectId= — the directory of the selected project's members,
// used by the assignee picker. Membership required; client-safe fields only.
import { Router } from "express";
import { requireAuth } from "../../auth/middleware.js";
import { sendData } from "../../lib/response.js";
import { requireProjectMember } from "../projects/middleware.js";
import { listProjectMembers } from "../projects/logic.js";

export const userRoutes = Router();

userRoutes.use(requireAuth);
userRoutes.use(requireProjectMember);

userRoutes.get("/", async (req, res, next) => {
  try {
    sendData(res, 200, { members: await listProjectMembers(req.projectId!) });
  } catch (err) {
    next(err);
  }
});

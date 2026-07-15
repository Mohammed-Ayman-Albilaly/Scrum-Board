// Project management: list my projects, create one, invite a member. Board
// resources (stories/sprints/ceremonies/board/users) are scoped separately via
// requireProjectMember + ?projectId=.
import { Router } from "express";
import { requireAuth } from "../../auth/middleware.js";
import { sameOriginOnly } from "../../middleware/csrf.js";
import { mutationLimiter } from "../../middleware/rateLimit.js";
import { parseBody } from "../../lib/validate.js";
import { param } from "../../lib/http.js";
import { sendData } from "../../lib/response.js";
import { ForbiddenError } from "../../lib/errors.js";
import { CreateProjectSchema, AddMemberSchema } from "./validation.js";
import { listProjectsForUser, createProject, addMemberByEmail, isMember } from "./logic.js";

export const projectRoutes = Router();

projectRoutes.use(requireAuth);

projectRoutes.get("/", async (req, res, next) => {
  try {
    sendData(res, 200, { projects: await listProjectsForUser(req.user!.id) });
  } catch (err) {
    next(err);
  }
});

projectRoutes.post("/", sameOriginOnly, mutationLimiter, async (req, res, next) => {
  try {
    const { name } = parseBody(CreateProjectSchema, req.body);
    sendData(res, 201, { project: await createProject(name, req.user!.id) });
  } catch (err) {
    next(err);
  }
});

// Invite an existing user by email. Only a current member may invite.
projectRoutes.post("/:id/members", sameOriginOnly, mutationLimiter, async (req, res, next) => {
  try {
    const projectId = param(req, "id");
    if (!(await isMember(projectId, req.user!.id))) {
      throw new ForbiddenError("You are not a member of this project.");
    }
    const { email } = parseBody(AddMemberSchema, req.body);
    sendData(res, 201, { project: await addMemberByEmail(projectId, email) });
  } catch (err) {
    next(err);
  }
});

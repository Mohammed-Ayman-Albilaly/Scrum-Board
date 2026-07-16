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
import { ROLES } from "../../config/constants.js";
import { CreateProjectSchema, AddMemberSchema, SetRolesSchema } from "./validation.js";
import {
  listProjectsForUser,
  createProject,
  addMemberByEmail,
  hasProjectRole,
  setMemberRoles,
} from "./logic.js";

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

/** 403 unless the requester holds SCRUM_MASTER in the `:id` project. */
async function assertScrumMaster(projectId: string, userId: string): Promise<void> {
  if (!(await hasProjectRole(projectId, userId, ROLES.SCRUM_MASTER))) {
    throw new ForbiddenError("Only a Scrum Master of this project can manage members.");
  }
}

// Invite an existing user by email + assign their role(s). Scrum Master only.
projectRoutes.post("/:id/members", sameOriginOnly, mutationLimiter, async (req, res, next) => {
  try {
    const projectId = param(req, "id");
    await assertScrumMaster(projectId, req.user!.id);
    const { email, roles } = parseBody(AddMemberSchema, req.body);
    const project = await addMemberByEmail(projectId, email, roles ?? [ROLES.TEAM_MEMBER]);
    sendData(res, 201, { project });
  } catch (err) {
    next(err);
  }
});

// Replace a member's role set. Scrum Master only.
projectRoutes.patch("/:id/members/:userId/roles", sameOriginOnly, mutationLimiter, async (req, res, next) => {
  try {
    const projectId = param(req, "id");
    await assertScrumMaster(projectId, req.user!.id);
    const { roles } = parseBody(SetRolesSchema, req.body);
    await setMemberRoles(projectId, param(req, "userId"), roles);
    sendData(res, 200, { success: true });
  } catch (err) {
    next(err);
  }
});

// Story endpoints. Reads: any authenticated user. Mutations: Product Owner,
// except column moves which Team Members and Product Owners may perform.
import { Router } from "express";
import { requireAuth, requireRole } from "../../auth/middleware.js";
import { sameOriginOnly } from "../../middleware/csrf.js";
import { mutationLimiter } from "../../middleware/rateLimit.js";
import { parseBody } from "../../lib/validate.js";
import { param } from "../../lib/http.js";
import { sendData } from "../../lib/response.js";
import { ROLES } from "../../config/constants.js";
import { requireProjectMember } from "../projects/middleware.js";
import {
  CreateStorySchema,
  UpdateStorySchema,
  MoveStorySchema,
  AssignSprintSchema,
  AssignAssigneeSchema,
  ReorderStorySchema,
} from "./validation.js";
import {
  listBacklog,
  createStory,
  updateStory,
  deleteStory,
  assignSprint,
  setAssignee,
  reorderStory,
  moveStory,
} from "./logic.js";

export const storyRoutes = Router();

storyRoutes.use(requireAuth);
storyRoutes.use(requireProjectMember);

storyRoutes.get("/", async (req, res, next) => {
  try {
    sendData(res, 200, { stories: await listBacklog(req.projectId!) });
  } catch (err) {
    next(err);
  }
});

const po = [sameOriginOnly, requireRole(ROLES.PRODUCT_OWNER), mutationLimiter];

storyRoutes.post("/", ...po, async (req, res, next) => {
  try {
    const input = parseBody(CreateStorySchema, req.body);
    sendData(res, 201, { story: await createStory(input, req.projectId!) });
  } catch (err) {
    next(err);
  }
});

storyRoutes.patch("/:id", ...po, async (req, res, next) => {
  try {
    const input = parseBody(UpdateStorySchema, req.body);
    sendData(res, 200, { story: await updateStory(param(req, "id"), input, req.projectId!) });
  } catch (err) {
    next(err);
  }
});

storyRoutes.delete("/:id", sameOriginOnly, requireRole(ROLES.PRODUCT_OWNER), async (req, res, next) => {
  try {
    await deleteStory(param(req, "id"), req.projectId!);
    sendData(res, 200, { success: true });
  } catch (err) {
    next(err);
  }
});

storyRoutes.patch("/:id/sprint", ...po, async (req, res, next) => {
  try {
    const { sprintId } = parseBody(AssignSprintSchema, req.body);
    sendData(res, 200, { story: await assignSprint(param(req, "id"), sprintId, req.projectId!) });
  } catch (err) {
    next(err);
  }
});

storyRoutes.patch("/:id/assign", ...po, async (req, res, next) => {
  try {
    const { assigneeId } = parseBody(AssignAssigneeSchema, req.body);
    sendData(res, 200, { story: await setAssignee(param(req, "id"), assigneeId, req.projectId!) });
  } catch (err) {
    next(err);
  }
});

storyRoutes.patch("/:id/reorder", ...po, async (req, res, next) => {
  try {
    const { direction } = parseBody(ReorderStorySchema, req.body);
    sendData(res, 200, { story: await reorderStory(param(req, "id"), direction, req.projectId!) });
  } catch (err) {
    next(err);
  }
});

const mover = [sameOriginOnly, requireRole(ROLES.TEAM_MEMBER, ROLES.PRODUCT_OWNER), mutationLimiter];

storyRoutes.patch("/:id/move", ...mover, async (req, res, next) => {
  try {
    const { column } = parseBody(MoveStorySchema, req.body);
    sendData(res, 200, { story: await moveStory(param(req, "id"), column, req.projectId!) });
  } catch (err) {
    next(err);
  }
});

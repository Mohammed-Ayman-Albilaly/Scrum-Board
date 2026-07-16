// Users feature routes:
//   GET   /users?projectId=  — member directory of one project (membership required)
//   GET   /users/contacts    — people sharing any project with the caller
//   PATCH /users/me          — update the caller's specialization
import { Router } from "express";
import { requireAuth } from "../../auth/middleware.js";
import { sameOriginOnly } from "../../middleware/csrf.js";
import { mutationLimiter } from "../../middleware/rateLimit.js";
import { sendData } from "../../lib/response.js";
import { parseBody } from "../../lib/validate.js";
import { requireProjectMember } from "../projects/middleware.js";
import { listProjectMembers } from "../projects/logic.js";
import { listContacts, updateSpecialization } from "./logic.js";
import { UpdateProfileSchema } from "./validation.js";

export const userRoutes = Router();

userRoutes.use(requireAuth);

// Project-scoped directory: membership guard stays on this route only.
userRoutes.get("/", requireProjectMember, async (req, res, next) => {
  try {
    sendData(res, 200, { members: await listProjectMembers(req.projectId!) });
  } catch (err) {
    next(err);
  }
});

// Cross-project by design: derived purely from the caller's own memberships.
userRoutes.get("/contacts", async (req, res, next) => {
  try {
    sendData(res, 200, { contacts: await listContacts(req.user!.id) });
  } catch (err) {
    next(err);
  }
});

userRoutes.patch("/me", sameOriginOnly, mutationLimiter, async (req, res, next) => {
  try {
    const { specialization } = parseBody(UpdateProfileSchema, req.body);
    sendData(res, 200, { user: await updateSpecialization(req.user!.id, specialization) });
  } catch (err) {
    next(err);
  }
});

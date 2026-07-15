// GET /users — the team directory that populates the assignee picker. Any
// authenticated user may read it; only client-safe fields are returned.
import { Router } from "express";
import { requireAuth } from "../../auth/middleware.js";
import { sendData } from "../../lib/response.js";
import { listMembers } from "./logic.js";

export const userRoutes = Router();

userRoutes.use(requireAuth);

userRoutes.get("/", async (_req, res, next) => {
  try {
    sendData(res, 200, { members: await listMembers() });
  } catch (err) {
    next(err);
  }
});

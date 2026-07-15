// GET /board — the aggregated read that renders the whole page. All roles.
import { Router } from "express";
import { requireAuth } from "../../auth/middleware.js";
import { sendData } from "../../lib/response.js";
import { requireProjectMember } from "../projects/middleware.js";
import { getBoard } from "./logic.js";

export const boardRoutes = Router();

boardRoutes.use(requireAuth);
boardRoutes.use(requireProjectMember);

boardRoutes.get("/", async (req, res, next) => {
  try {
    sendData(res, 200, await getBoard(req.projectId!));
  } catch (err) {
    next(err);
  }
});

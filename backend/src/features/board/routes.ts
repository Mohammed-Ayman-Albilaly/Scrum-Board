// GET /board — the aggregated read that renders the whole page. All roles.
import { Router } from "express";
import { requireAuth } from "../../auth/middleware.js";
import { sendData } from "../../lib/response.js";
import { DEFAULT_PROJECT_ID } from "../../config/constants.js";
import { getBoard } from "./logic.js";

export const boardRoutes = Router();

boardRoutes.use(requireAuth);

boardRoutes.get("/", async (_req, res, next) => {
  try {
    sendData(res, 200, await getBoard(DEFAULT_PROJECT_ID));
  } catch (err) {
    next(err);
  }
});

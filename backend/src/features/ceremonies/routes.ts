// Ceremony endpoints. Reads: any authenticated user. Create: Scrum Master.
import { Router } from "express";
import { requireAuth, requireRole } from "../../auth/middleware.js";
import { sameOriginOnly } from "../../middleware/csrf.js";
import { mutationLimiter } from "../../middleware/rateLimit.js";
import { parseBody } from "../../lib/validate.js";
import { sendData } from "../../lib/response.js";
import { ROLES, DEFAULT_PROJECT_ID } from "../../config/constants.js";
import { CreateCeremonySchema } from "./validation.js";
import { listCeremonies, createCeremony, paginate } from "./logic.js";

const PID = DEFAULT_PROJECT_ID;
export const ceremonyRoutes = Router();

ceremonyRoutes.use(requireAuth);

ceremonyRoutes.get("/", async (req, res, next) => {
  try {
    const { limit, offset } = paginate(req.query.limit, req.query.offset);
    sendData(res, 200, { ceremonies: await listCeremonies(PID, limit, offset) });
  } catch (err) {
    next(err);
  }
});

ceremonyRoutes.post(
  "/",
  sameOriginOnly,
  requireRole(ROLES.SCRUM_MASTER),
  mutationLimiter,
  async (req, res, next) => {
    try {
      const input = parseBody(CreateCeremonySchema, req.body);
      const ceremony = await createCeremony(input, PID, req.user!.id);
      sendData(res, 201, { ceremony });
    } catch (err) {
      next(err);
    }
  },
);

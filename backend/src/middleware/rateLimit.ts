// Rate limiter for mutation endpoints — 10 requests/min per authenticated user.
// Applied after requireAuth, so req.user is always present.
import rateLimit from "express-rate-limit";
import { env } from "../config/env.js";

export const mutationLimiter = rateLimit({
  windowMs: 60_000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.user?.id ?? "anonymous",
  skip: () => env.NODE_ENV === "test", // don't throttle the test suite
});

// Auth endpoints — thin handlers that delegate to Better Auth's server API.
// POST /auth/signup · POST /auth/login · POST /auth/logout · GET /auth/me
import { Router } from "express";
import rateLimit from "express-rate-limit";
import { fromNodeHeaders } from "better-auth/node";
import { auth } from "./betterAuth.js";
import { requireAuth } from "./middleware.js";
import { sameOriginOnly } from "../middleware/csrf.js";
import { env } from "../config/env.js";
import { DEFAULT_PROJECT_ID } from "../config/constants.js";
import { ensureMembership } from "../features/projects/logic.js";
import { SignupSchema, LoginSchema } from "./validation.js";
import { parseBody, publicUser, forwardCookies, mapAuthError } from "./logic.js";
import { sendData } from "../lib/response.js";

export const authRoutes = Router();

// Throttle credential endpoints to slow brute-force / enumeration attempts.
const authLimiter = rateLimit({
  windowMs: 60_000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => env.NODE_ENV === "test", // don't throttle the test suite
});

authRoutes.post("/signup", sameOriginOnly, authLimiter, async (req, res, next) => {
  try {
    const body = parseBody(SignupSchema, req.body);
    const { headers, response } = await auth.api.signUpEmail({
      body: { name: body.name, email: body.email, password: body.password },
      returnHeaders: true,
    });
    // Enroll every new user in the shared team project (as a Team Member) so
    // the default board works out of the box; project Scrum Masters assign
    // further roles per project.
    await ensureMembership(DEFAULT_PROJECT_ID, response.user.id);
    forwardCookies(res, headers);
    sendData(res, 201, { user: publicUser(response.user) });
  } catch (err) {
    next(mapAuthError(err));
  }
});

authRoutes.post("/login", sameOriginOnly, authLimiter, async (req, res, next) => {
  try {
    const body = parseBody(LoginSchema, req.body);
    const { headers, response } = await auth.api.signInEmail({
      body: { email: body.email, password: body.password },
      returnHeaders: true,
    });
    forwardCookies(res, headers);
    sendData(res, 200, { user: publicUser(response.user) });
  } catch (err) {
    next(mapAuthError(err));
  }
});

authRoutes.post("/logout", sameOriginOnly, requireAuth, async (req, res, next) => {
  try {
    const { headers } = await auth.api.signOut({
      headers: fromNodeHeaders(req.headers),
      returnHeaders: true,
    });
    forwardCookies(res, headers);
    sendData(res, 200, { success: true });
  } catch (err) {
    next(err);
  }
});

authRoutes.get("/me", requireAuth, (req, res) => {
  sendData(res, 200, { user: req.user });
});

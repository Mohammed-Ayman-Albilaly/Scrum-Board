// Auth endpoints — thin handlers that delegate to Better Auth's server API.
// POST /auth/signup · POST /auth/login · POST /auth/logout · GET /auth/me
import { Router } from "express";
import rateLimit from "express-rate-limit";
import { fromNodeHeaders } from "better-auth/node";
import { auth } from "./betterAuth.js";
import { requireAuth } from "./middleware.js";
import { SignupSchema, LoginSchema } from "./validation.js";
import {
  parseBody,
  assertSpecializationRule,
  publicUser,
  forwardCookies,
  mapAuthError,
} from "./logic.js";
import { sendData } from "../lib/response.js";

export const authRoutes = Router();

// Throttle credential endpoints to slow brute-force / enumeration attempts.
const authLimiter = rateLimit({
  windowMs: 60_000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
});

authRoutes.post("/signup", authLimiter, async (req, res, next) => {
  try {
    const body = parseBody(SignupSchema, req.body);
    assertSpecializationRule(body.role, body.specialization);
    const { headers, response } = await auth.api.signUpEmail({
      body: {
        name: body.name,
        email: body.email,
        password: body.password,
        role: body.role,
        specialization: body.specialization,
      },
      returnHeaders: true,
    });
    forwardCookies(res, headers);
    sendData(res, 201, { user: publicUser(response.user) });
  } catch (err) {
    next(mapAuthError(err));
  }
});

authRoutes.post("/login", authLimiter, async (req, res, next) => {
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

authRoutes.post("/logout", requireAuth, async (req, res, next) => {
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

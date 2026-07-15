// Session guard + role checker. Used by every protected/mutation route.
import type { Request, Response, NextFunction } from "express";
import { fromNodeHeaders } from "better-auth/node";
import { auth } from "./betterAuth.js";
import { AuthError, ForbiddenError } from "../lib/errors.js";
import type { Role } from "../config/constants.js";
import type { SafeUser } from "../lib/types.js";

/** Reject unauthenticated requests; attach the current user on success. */
export async function requireAuth(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const result = await auth.api.getSession({
      headers: fromNodeHeaders(req.headers),
    });
    if (!result?.user) throw new AuthError();
    req.user = toSafeUser(result.user);
    next();
  } catch (err) {
    next(err instanceof AuthError ? err : new AuthError());
  }
}

/** Guard a route to specific roles. Assumes requireAuth ran first. */
export function requireRole(...allowed: Role[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) return next(new AuthError());
    if (!allowed.includes(req.user.role)) return next(new ForbiddenError());
    next();
  };
}

function toSafeUser(u: Record<string, unknown>): SafeUser {
  return {
    id: String(u.id),
    name: String(u.name),
    email: String(u.email),
    role: u.role as Role,
    specialization: (u.specialization ?? null) as SafeUser["specialization"],
  };
}

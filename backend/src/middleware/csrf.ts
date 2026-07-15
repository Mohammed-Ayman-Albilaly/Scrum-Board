// CSRF defense-in-depth for cookie-authenticated, state-changing routes.
// We call Better Auth's server API directly, which bypasses its built-in
// origin checks — so we verify the Origin header matches our host here.
// Same-origin browser fetches and non-browser clients (no Origin) are allowed.
import type { Request, Response, NextFunction } from "express";
import { ForbiddenError } from "../lib/errors.js";

export function sameOriginOnly(req: Request, _res: Response, next: NextFunction): void {
  const origin = req.get("origin");
  if (!origin) return next(); // same-origin navigations / server-to-server send none
  try {
    if (new URL(origin).host === req.get("host")) return next();
  } catch {
    /* malformed Origin — fall through to rejection */
  }
  next(new ForbiddenError("Cross-origin request blocked."));
}

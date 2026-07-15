// Pure helpers for the auth routes: validation, field rules, and response shaping.
import type { Response } from "express";
import type { Static, TSchema } from "@sinclair/typebox";
import { Value } from "@sinclair/typebox/value";
import { APIError } from "better-auth/api";
import { ROLES, type Role, type Specialization } from "../config/constants.js";
import { ValidationError, ConflictError, AuthError } from "../lib/errors.js";
import type { SafeUser } from "../lib/types.js";

/** Strip unknown keys, then validate against the schema. Throws ValidationError. */
export function parseBody<T extends TSchema>(schema: T, body: unknown): Static<T> {
  if (typeof body !== "object" || body === null) {
    throw new ValidationError("Request body must be a JSON object.");
  }
  const cleaned = Value.Clean(schema, { ...(body as Record<string, unknown>) });
  if (!Value.Check(schema, cleaned)) {
    const first = [...Value.Errors(schema, cleaned)][0];
    const where = first?.path ? first.path.replace(/^\//, "") : "body";
    throw new ValidationError(`${where}: ${first?.message ?? "is invalid"}.`);
  }
  return cleaned as Static<T>;
}

/** Specialization is required for Team Members and forbidden for other roles. */
export function assertSpecializationRule(
  role: Role,
  specialization: Specialization | undefined,
): void {
  if (role === ROLES.TEAM_MEMBER && !specialization) {
    throw new ValidationError("Team Members must select a specialization.");
  }
  if (role !== ROLES.TEAM_MEMBER && specialization) {
    throw new ValidationError("Only Team Members can have a specialization.");
  }
}

/** Project a Better Auth user into the client-safe shape. */
export function publicUser(u: Record<string, unknown>): SafeUser {
  return {
    id: String(u.id),
    name: String(u.name),
    email: String(u.email),
    role: u.role as Role,
    specialization: (u.specialization ?? null) as Specialization | null,
  };
}

/** Relay Better Auth's Set-Cookie header(s) onto the Express response. */
export function forwardCookies(res: Response, headers: Headers): void {
  const cookies = headers.getSetCookie();
  if (cookies.length > 0) res.setHeader("set-cookie", cookies);
}

/** Translate Better Auth API errors into our typed HTTP errors. */
export function mapAuthError(err: unknown): unknown {
  if (!(err instanceof APIError)) return err;
  const status = typeof err.statusCode === "number" ? err.statusCode : 400;
  if (status === 422 || /exist|already/i.test(err.message)) {
    return new ConflictError("An account with that email already exists.");
  }
  if (status === 401 || status === 403) {
    return new AuthError("Invalid email or password.");
  }
  return new ValidationError(err.message);
}

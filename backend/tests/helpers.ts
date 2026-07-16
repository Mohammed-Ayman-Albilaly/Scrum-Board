// Shared test fixtures + a signup helper that returns an authenticated agent.
// Roles are per project: signup carries no role, so `signIn` grants the
// fixture's `roles` in the default project via a direct DB insert (the seeded
// shared project has no Scrum Master to bootstrap through the API).
import request from "supertest";
import type { Express } from "express";
import { and, eq } from "drizzle-orm";
import { db } from "../src/config/db.js";
import { user } from "../src/auth/schema.js";
import { projectMemberRole } from "../src/features/projects/schema.js";
import { DEFAULT_PROJECT_ID, type Role } from "../src/config/constants.js";

export const PRODUCT_OWNER = {
  name: "Pat Owner",
  email: "po@team.com",
  password: "password123",
  roles: ["PRODUCT_OWNER"],
} as const;

export const SCRUM_MASTER = {
  name: "Sam Master",
  email: "sm@team.com",
  password: "password123",
  roles: ["SCRUM_MASTER"],
} as const;

export const TEAM_MEMBER = {
  name: "Tam Member",
  email: "tm@team.com",
  password: "password123",
  roles: ["TEAM_MEMBER"],
} as const;

/** Replace a user's role rows for a project, bypassing the API (test seeding). */
export async function grantProjectRoles(
  email: string,
  roles: readonly Role[],
  projectId: string = DEFAULT_PROJECT_ID,
): Promise<void> {
  const [target] = await db.select({ id: user.id }).from(user).where(eq(user.email, email)).limit(1);
  if (!target) throw new Error(`grantProjectRoles: no user with email ${email}`);
  await db
    .delete(projectMemberRole)
    .where(and(eq(projectMemberRole.projectId, projectId), eq(projectMemberRole.userId, target.id)));
  await db
    .insert(projectMemberRole)
    .values(roles.map((role) => ({ projectId, userId: target.id, role, createdAt: new Date() })));
}

/**
 * Sign up and return a supertest agent carrying the session cookie. The
 * fixture's `roles` (if any) are granted in the default project.
 */
export async function signIn(
  app: Express,
  fixture: Record<string, unknown>,
): Promise<ReturnType<typeof request.agent>> {
  const { roles, ...signupBody } = fixture;
  const agent = request.agent(app);
  const res = await agent.post("/auth/signup").send(signupBody);
  if (res.status !== 201) {
    throw new Error(`signup failed (${res.status}): ${JSON.stringify(res.body)}`);
  }
  if (Array.isArray(roles) && roles.length > 0) {
    await grantProjectRoles(String(signupBody.email), roles as Role[]);
  }
  return agent;
}

// Project membership + lifecycle. Membership gates access to every board
// resource; roles are PER PROJECT (multi-role, one row each in
// project_member_role) and a user's effective permissions are the union.
import { and, asc, eq } from "drizzle-orm";
import { db } from "../../config/db.js";
import { user } from "../../auth/schema.js";
import { newId } from "../../lib/id.js";
import { NotFoundError, ConflictError } from "../../lib/errors.js";
import { ROLES, type Role } from "../../config/constants.js";
import { project, projectMember, projectMemberRole } from "./schema.js";

export interface ProjectDto {
  id: string;
  name: string;
  createdBy: string | null;
  /** The requesting user's roles in this project (listProjectsForUser only). */
  roles?: Role[];
}

function serializeProject(row: typeof project.$inferSelect): ProjectDto {
  return { id: row.id, name: row.name, createdBy: row.createdBy };
}

/** True if the user belongs to the project. Gate for every scoped resource. */
export async function isMember(projectId: string, userId: string): Promise<boolean> {
  const [row] = await db
    .select({ userId: projectMember.userId })
    .from(projectMember)
    .where(and(eq(projectMember.projectId, projectId), eq(projectMember.userId, userId)))
    .limit(1);
  return row !== undefined;
}

/**
 * The user's roles in a project, or null when they are not a member.
 * (A member with zero role rows yields [] — member, but no permissions.)
 */
export async function getMemberRoles(projectId: string, userId: string): Promise<Role[] | null> {
  if (!(await isMember(projectId, userId))) return null;
  const rows = await db
    .select({ role: projectMemberRole.role })
    .from(projectMemberRole)
    .where(and(eq(projectMemberRole.projectId, projectId), eq(projectMemberRole.userId, userId)));
  return rows.map((r) => r.role as Role);
}

/** True if the user holds `role` in the project. */
export async function hasProjectRole(projectId: string, userId: string, role: Role): Promise<boolean> {
  const roles = await getMemberRoles(projectId, userId);
  return roles !== null && roles.includes(role);
}

/** Add a membership + roles if not already a member (idempotent). */
export async function ensureMembership(
  projectId: string,
  userId: string,
  roles: Role[] = [ROLES.TEAM_MEMBER],
): Promise<void> {
  if (await isMember(projectId, userId)) return;
  const now = new Date();
  await db.transaction(async (tx) => {
    await tx.insert(projectMember).values({ projectId, userId, createdAt: now });
    await tx
      .insert(projectMemberRole)
      .values(roles.map((role) => ({ projectId, userId, role, createdAt: now })));
  });
}

/** Replace a member's role set atomically. 404 if they are not a member. */
export async function setMemberRoles(projectId: string, userId: string, roles: Role[]): Promise<void> {
  if (!(await isMember(projectId, userId))) {
    throw new NotFoundError("That user is not a member of this project.");
  }
  const now = new Date();
  await db.transaction(async (tx) => {
    await tx
      .delete(projectMemberRole)
      .where(and(eq(projectMemberRole.projectId, projectId), eq(projectMemberRole.userId, userId)));
    await tx
      .insert(projectMemberRole)
      .values(roles.map((role) => ({ projectId, userId, role, createdAt: now })));
  });
}

/** Fold (entity, role|null) join rows into entities with a roles array. */
function groupRoles<T extends { id: string }>(
  rows: Array<{ entity: T; role: string | null }>,
): Array<T & { roles: Role[] }> {
  const byId = new Map<string, T & { roles: Role[] }>();
  for (const { entity, role } of rows) {
    const existing = byId.get(entity.id) ?? { ...entity, roles: [] };
    if (role) existing.roles.push(role as Role);
    byId.set(entity.id, existing);
  }
  return [...byId.values()];
}

/** The user's projects, each with THEIR roles in it. */
export async function listProjectsForUser(userId: string): Promise<ProjectDto[]> {
  const rows = await db
    .select({ project, role: projectMemberRole.role })
    .from(projectMember)
    .innerJoin(project, eq(project.id, projectMember.projectId))
    .leftJoin(
      projectMemberRole,
      and(
        eq(projectMemberRole.projectId, projectMember.projectId),
        eq(projectMemberRole.userId, projectMember.userId),
      ),
    )
    .where(eq(projectMember.userId, userId))
    .orderBy(asc(project.createdAt));
  return groupRoles(rows.map((r) => ({ entity: r.project, role: r.role }))).map((p) => ({
    ...serializeProject(p),
    roles: p.roles,
  }));
}

/** Create a project; the creator (founder) is enrolled as Scrum Master. */
export async function createProject(name: string, userId: string): Promise<ProjectDto> {
  const now = new Date();
  const row = { id: newId(), name: name.trim(), createdBy: userId, createdAt: now };
  await db.transaction(async (tx) => {
    await tx.insert(project).values(row);
    await tx.insert(projectMember).values({ projectId: row.id, userId, createdAt: now });
    await tx
      .insert(projectMemberRole)
      .values({ projectId: row.id, userId, role: ROLES.SCRUM_MASTER, createdAt: now });
  });
  return { ...serializeProject(row), roles: [ROLES.SCRUM_MASTER] };
}

/** Invite an existing user (by email) with the given roles. SM-only (routes). */
export async function addMemberByEmail(
  projectId: string,
  email: string,
  roles: Role[],
): Promise<ProjectDto> {
  const [target] = await db
    .select({ id: user.id })
    .from(user)
    .where(eq(user.email, email.trim().toLowerCase()))
    .limit(1);
  if (!target) throw new NotFoundError("No user with that email.");
  if (await isMember(projectId, target.id)) {
    throw new ConflictError("That user is already a member.");
  }
  await ensureMembership(projectId, target.id, roles);
  const [row] = await db.select().from(project).where(eq(project.id, projectId)).limit(1);
  if (!row) throw new NotFoundError("Project not found.");
  return serializeProject(row);
}

export interface MemberDto {
  id: string;
  name: string;
  roles: Role[];
  specialization: string | null;
}

/** The project's members with their per-project roles (client-safe fields only). */
export async function listProjectMembers(projectId: string): Promise<MemberDto[]> {
  const rows = await db
    .select({ id: user.id, name: user.name, specialization: user.specialization, role: projectMemberRole.role })
    .from(projectMember)
    .innerJoin(user, eq(user.id, projectMember.userId))
    .leftJoin(
      projectMemberRole,
      and(
        eq(projectMemberRole.projectId, projectMember.projectId),
        eq(projectMemberRole.userId, projectMember.userId),
      ),
    )
    .where(eq(projectMember.projectId, projectId))
    .orderBy(asc(user.name));
  return groupRoles(
    rows.map((r) => ({ entity: { id: r.id, name: r.name, specialization: r.specialization ?? null }, role: r.role })),
  );
}

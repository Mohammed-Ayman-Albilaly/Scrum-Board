// Project membership + lifecycle. Membership gates access to every board
// resource; roles stay global (user.role) and apply within each project.
import { and, asc, eq } from "drizzle-orm";
import { db } from "../../config/db.js";
import { user } from "../../auth/schema.js";
import { newId } from "../../lib/id.js";
import { NotFoundError, ConflictError } from "../../lib/errors.js";
import { project, projectMember } from "./schema.js";

export interface ProjectDto {
  id: string;
  name: string;
  createdBy: string | null;
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

/** Add a membership if it does not already exist (idempotent). */
export async function ensureMembership(projectId: string, userId: string): Promise<void> {
  if (await isMember(projectId, userId)) return;
  await db.insert(projectMember).values({ projectId, userId, createdAt: new Date() });
}

export async function listProjectsForUser(userId: string): Promise<ProjectDto[]> {
  const rows = await db
    .select({ project })
    .from(projectMember)
    .innerJoin(project, eq(project.id, projectMember.projectId))
    .where(eq(projectMember.userId, userId))
    .orderBy(asc(project.createdAt));
  return rows.map((r) => serializeProject(r.project));
}

export async function createProject(name: string, userId: string): Promise<ProjectDto> {
  const now = new Date();
  const row = { id: newId(), name: name.trim(), createdBy: userId, createdAt: now };
  await db.transaction(async (tx) => {
    await tx.insert(project).values(row);
    await tx.insert(projectMember).values({ projectId: row.id, userId, createdAt: now });
  });
  return serializeProject(row);
}

/** Invite an existing user (by email) into a project. Requester must be a member. */
export async function addMemberByEmail(projectId: string, email: string): Promise<ProjectDto> {
  const [target] = await db
    .select({ id: user.id })
    .from(user)
    .where(eq(user.email, email.trim().toLowerCase()))
    .limit(1);
  if (!target) throw new NotFoundError("No user with that email.");
  if (await isMember(projectId, target.id)) {
    throw new ConflictError("That user is already a member.");
  }
  await db.insert(projectMember).values({ projectId, userId: target.id, createdAt: new Date() });
  const [row] = await db.select().from(project).where(eq(project.id, projectId)).limit(1);
  if (!row) throw new NotFoundError("Project not found.");
  return serializeProject(row);
}

export interface MemberDto {
  id: string;
  name: string;
  role: string;
  specialization: string | null;
}

/** The project's members — powers the assignee picker (client-safe fields only). */
export async function listProjectMembers(projectId: string): Promise<MemberDto[]> {
  const rows = await db
    .select({
      id: user.id,
      name: user.name,
      role: user.role,
      specialization: user.specialization,
    })
    .from(projectMember)
    .innerJoin(user, eq(user.id, projectMember.userId))
    .where(eq(projectMember.projectId, projectId))
    .orderBy(asc(user.name));
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    role: r.role,
    specialization: r.specialization ?? null,
  }));
}

// Users feature logic: the derived contacts list ("people you've worked
// with" = co-members of any shared project) and profile updates.
import { and, asc, eq, ne } from "drizzle-orm";
import { alias } from "drizzle-orm/sqlite-core";
import { db } from "../../config/db.js";
import { user } from "../../auth/schema.js";
import { project, projectMember } from "../projects/schema.js";
import { NotFoundError } from "../../lib/errors.js";
import type { Specialization } from "../../config/constants.js";
import type { SafeUser } from "../../lib/types.js";

export interface ContactDto {
  id: string;
  name: string;
  email: string;
  specialization: string | null;
  sharedProjects: Array<{ id: string; name: string }>;
}

/** Distinct users sharing at least one project with the caller (self excluded). */
export async function listContacts(userId: string): Promise<ContactDto[]> {
  const pmOther = alias(projectMember, "pm_other");
  const rows = await db
    .select({
      id: user.id,
      name: user.name,
      email: user.email,
      specialization: user.specialization,
      projectId: project.id,
      projectName: project.name,
    })
    .from(projectMember)
    .innerJoin(pmOther, eq(pmOther.projectId, projectMember.projectId))
    .innerJoin(user, eq(user.id, pmOther.userId))
    .innerJoin(project, eq(project.id, projectMember.projectId))
    .where(and(eq(projectMember.userId, userId), ne(pmOther.userId, userId)))
    .orderBy(asc(user.name), asc(project.createdAt));
  return foldContacts(rows);
}

function foldContacts(
  rows: Array<{ id: string; name: string; email: string; specialization: string | null; projectId: string; projectName: string }>,
): ContactDto[] {
  const byId = new Map<string, ContactDto>();
  for (const r of rows) {
    const contact = byId.get(r.id) ?? {
      id: r.id, name: r.name, email: r.email, specialization: r.specialization ?? null, sharedProjects: [],
    };
    contact.sharedProjects.push({ id: r.projectId, name: r.projectName });
    byId.set(r.id, contact);
  }
  return [...byId.values()];
}

/** Update the caller's specialization (the only client-editable profile field). */
export async function updateSpecialization(
  userId: string,
  specialization: Specialization | null,
): Promise<SafeUser> {
  await db.update(user).set({ specialization, updatedAt: new Date() }).where(eq(user.id, userId));
  const [row] = await db
    .select({ id: user.id, name: user.name, email: user.email, specialization: user.specialization })
    .from(user)
    .where(eq(user.id, userId))
    .limit(1);
  if (!row) throw new NotFoundError("User not found.");
  return { ...row, specialization: (row.specialization ?? null) as SafeUser["specialization"] };
}

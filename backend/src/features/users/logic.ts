// User directory logic. Reads the Better Auth `user` table for the assignee
// picker. Only client-safe columns are selected — never email, hash, or tokens.
import { asc, eq } from "drizzle-orm";
import { db } from "../../config/db.js";
import { user } from "../../auth/schema.js";
import type { Role, Specialization } from "../../config/constants.js";

export interface MemberDto {
  id: string;
  name: string;
  role: Role;
  specialization: Specialization | null;
}

export async function listMembers(): Promise<MemberDto[]> {
  const rows = await db
    .select({
      id: user.id,
      name: user.name,
      role: user.role,
      specialization: user.specialization,
    })
    .from(user)
    .orderBy(asc(user.name));
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    role: r.role as Role,
    specialization: (r.specialization ?? null) as Specialization | null,
  }));
}

/** True if a user with this id exists — used to validate story assignees. */
export async function userExists(id: string): Promise<boolean> {
  const [row] = await db
    .select({ id: user.id })
    .from(user)
    .where(eq(user.id, id))
    .limit(1);
  return row !== undefined;
}

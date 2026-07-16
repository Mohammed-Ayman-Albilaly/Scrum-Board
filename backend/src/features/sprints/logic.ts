// Sprint lifecycle logic. Only the Scrum Master reaches these (enforced at route).
import { and, asc, count, eq } from "drizzle-orm";
import { db } from "../../config/db.js";
import { sprint } from "./schema.js";
import { story } from "../stories/schema.js";
import { ceremony } from "../ceremonies/schema.js";
import { newId } from "../../lib/id.js";
import { sanitizeText } from "../../lib/sanitize.js";
import { NotFoundError, ValidationError, ConflictError } from "../../lib/errors.js";
import { SPRINT_STATUSES } from "../../config/constants.js";
import type { CreateSprintInput } from "./validation.js";

type SprintRow = typeof sprint.$inferSelect;

export function serializeSprint(row: SprintRow) {
  return {
    id: row.id,
    name: row.name,
    goal: row.goal,
    startDate: row.startDate?.toISOString() ?? null,
    endDate: row.endDate?.toISOString() ?? null,
    status: row.status,
  };
}

function parseDate(value: string | undefined, label: string): Date | null {
  if (value === undefined) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw new ValidationError(`${label} is not a valid date.`);
  return date;
}

export async function listSprints(projectId: string) {
  const rows = await db
    .select()
    .from(sprint)
    .where(eq(sprint.projectId, projectId))
    .orderBy(asc(sprint.createdAt));
  return rows.map(serializeSprint);
}

export async function createSprint(input: CreateSprintInput, projectId: string, userId: string) {
  const now = new Date();
  const startDate = parseDate(input.startDate, "startDate");
  const endDate = parseDate(input.endDate, "endDate");
  if (startDate && endDate && endDate < startDate) {
    throw new ValidationError("Sprint end date cannot be before its start date.");
  }
  const row = {
    id: newId(),
    projectId,
    name: input.name.trim(),
    goal: input.goal ? sanitizeText(input.goal) : null,
    startDate,
    endDate,
    status: SPRINT_STATUSES.ACTIVE,
    createdBy: userId,
    createdAt: now,
    updatedAt: now,
  };
  await db.insert(sprint).values(row);
  return serializeSprint(row as SprintRow);
}

export async function closeSprint(id: string, projectId: string) {
  const [row] = await db
    .select()
    .from(sprint)
    .where(and(eq(sprint.id, id), eq(sprint.projectId, projectId)))
    .limit(1);
  if (!row) throw new NotFoundError("Sprint not found.");
  await db
    .update(sprint)
    .set({ status: SPRINT_STATUSES.CLOSED, updatedAt: new Date() })
    .where(eq(sprint.id, id));
  return serializeSprint({ ...row, status: SPRINT_STATUSES.CLOSED });
}

/**
 * Delete a sprint (open or closed) — e.g. to remove an accidental duplicate.
 * Refuses if the sprint still has stories (move or remove them first) so no
 * work item silently disappears. Ceremony logs tied to the sprint are
 * dropped with it; SQLite FK actions aren't enforced at runtime here
 * (no PRAGMA foreign_keys=ON), so both steps are explicit in one transaction.
 */
export async function deleteSprint(id: string, projectId: string): Promise<void> {
  const [row] = await db
    .select({ id: sprint.id })
    .from(sprint)
    .where(and(eq(sprint.id, id), eq(sprint.projectId, projectId)))
    .limit(1);
  if (!row) throw new NotFoundError("Sprint not found.");

  const [{ value }] = await db.select({ value: count() }).from(story).where(eq(story.sprintId, id));
  if (value > 0) {
    throw new ConflictError("Move this sprint's stories back to the backlog before deleting it.");
  }

  await db.transaction(async (tx) => {
    await tx.delete(ceremony).where(eq(ceremony.sprintId, id));
    await tx.delete(sprint).where(eq(sprint.id, id));
  });
}

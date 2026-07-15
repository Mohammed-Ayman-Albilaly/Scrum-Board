// Sprint lifecycle logic. Only the Scrum Master reaches these (enforced at route).
import { and, asc, eq } from "drizzle-orm";
import { db } from "../../config/db.js";
import { sprint } from "./schema.js";
import { newId } from "../../lib/id.js";
import { sanitizeText } from "../../lib/sanitize.js";
import { NotFoundError, ValidationError } from "../../lib/errors.js";
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
  const row = {
    id: newId(),
    projectId,
    name: input.name.trim(),
    goal: input.goal ? sanitizeText(input.goal) : null,
    startDate: parseDate(input.startDate, "startDate"),
    endDate: parseDate(input.endDate, "endDate"),
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

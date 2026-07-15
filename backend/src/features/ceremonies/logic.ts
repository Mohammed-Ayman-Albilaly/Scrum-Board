// Ceremony logging. Only the Scrum Master creates; anyone authenticated reads.
import { and, desc, eq } from "drizzle-orm";
import { db } from "../../config/db.js";
import { ceremony } from "./schema.js";
import { sprint } from "../sprints/schema.js";
import { newId } from "../../lib/id.js";
import { sanitizeText } from "../../lib/sanitize.js";
import { NotFoundError } from "../../lib/errors.js";
import { CEREMONY_TEXT_FIELDS, type CreateCeremonyInput } from "./validation.js";

type CeremonyRow = typeof ceremony.$inferSelect;

const DEFAULT_LIMIT = 25;
const MAX_LIMIT = 100;

export function serializeCeremony(row: CeremonyRow) {
  return {
    id: row.id,
    type: row.type,
    sprintId: row.sprintId,
    details: (row.details ? JSON.parse(row.details) : {}) as Record<string, string | number>,
    createdAt: row.createdAt.toISOString(),
  };
}

/** Keep only the fields valid for this ceremony type; sanitize all text. */
function buildDetails(input: CreateCeremonyInput): Record<string, string | number> {
  const details: Record<string, string | number> = {};
  for (const field of CEREMONY_TEXT_FIELDS[input.type]) {
    const value = input[field];
    if (typeof value === "string" && value.trim()) details[field] = sanitizeText(value);
  }
  if (input.type === "PLANNING" && input.committedPoints !== undefined) {
    details.committedPoints = input.committedPoints;
  }
  return details;
}

/** Clamp pagination params to safe bounds (offset-based, per CLAUDE.md). */
export function paginate(rawLimit: unknown, rawOffset: unknown) {
  const limit = Math.min(Math.max(Number(rawLimit) || DEFAULT_LIMIT, 1), MAX_LIMIT);
  const offset = Math.max(Number(rawOffset) || 0, 0);
  return { limit, offset };
}

export async function listCeremonies(projectId: string, limit: number, offset: number) {
  const rows = await db
    .select()
    .from(ceremony)
    .where(eq(ceremony.projectId, projectId))
    .orderBy(desc(ceremony.createdAt))
    .limit(limit)
    .offset(offset);
  return rows.map(serializeCeremony);
}

export async function createCeremony(input: CreateCeremonyInput, projectId: string, userId: string) {
  if (input.sprintId) await assertSprintExists(input.sprintId, projectId);
  const row = {
    id: newId(),
    projectId,
    sprintId: input.sprintId ?? null,
    type: input.type,
    notes: null,
    details: JSON.stringify(buildDetails(input)),
    createdBy: userId,
    createdAt: new Date(),
  };
  await db.insert(ceremony).values(row);
  return serializeCeremony(row as CeremonyRow);
}

async function assertSprintExists(sprintId: string, projectId: string): Promise<void> {
  const [row] = await db
    .select({ id: sprint.id })
    .from(sprint)
    .where(and(eq(sprint.id, sprintId), eq(sprint.projectId, projectId)))
    .limit(1);
  if (!row) throw new NotFoundError("Sprint not found.");
}

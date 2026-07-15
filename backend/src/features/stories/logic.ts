// Story business logic: backlog CRUD, sprint assignment, and column moves.
// Enforces the "closed sprint is read-only" rule server-side.
import { and, asc, eq, isNull } from "drizzle-orm";
import { db } from "../../config/db.js";
import { story } from "./schema.js";
import { sprint } from "../sprints/schema.js";
import { newId } from "../../lib/id.js";
import { sanitizeText } from "../../lib/sanitize.js";
import { NotFoundError, ValidationError, ForbiddenError } from "../../lib/errors.js";
import { SPRINT_COLUMNS, SPRINT_STATUSES } from "../../config/constants.js";
import type { CreateStoryInput, UpdateStoryInput } from "./validation.js";

type StoryRow = typeof story.$inferSelect;

export function serializeStory(row: StoryRow) {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    storyPoints: row.storyPoints,
    status: row.status,
    sprintId: row.sprintId,
    column: row.column,
    priority: row.priority,
    assigneeId: row.assigneeId,
  };
}

async function findStory(id: string, projectId: string): Promise<StoryRow> {
  const [row] = await db
    .select()
    .from(story)
    .where(and(eq(story.id, id), eq(story.projectId, projectId)))
    .limit(1);
  if (!row) throw new NotFoundError("Story not found.");
  return row;
}

export async function listBacklog(projectId: string) {
  const rows = await db
    .select()
    .from(story)
    .where(and(eq(story.projectId, projectId), isNull(story.sprintId)))
    .orderBy(asc(story.priority), asc(story.createdAt));
  return rows.map(serializeStory);
}

export async function createStory(input: CreateStoryInput, projectId: string) {
  const now = new Date();
  const row = {
    id: newId(),
    projectId,
    title: input.title.trim(),
    description: input.description ? sanitizeText(input.description) : null,
    storyPoints: input.storyPoints ?? null,
    status: input.status ?? "UNREFINED",
    sprintId: null,
    column: null,
    priority: input.priority ?? 0,
    assigneeId: input.assigneeId ?? null,
    createdAt: now,
    updatedAt: now,
  };
  await db.insert(story).values(row);
  return serializeStory(row as StoryRow);
}

export async function updateStory(id: string, input: UpdateStoryInput, projectId: string) {
  await findStory(id, projectId);
  const patch: Partial<StoryRow> = { updatedAt: new Date() };
  if (input.title !== undefined) patch.title = input.title.trim();
  if (input.description !== undefined)
    patch.description = input.description ? sanitizeText(input.description) : null;
  if (input.storyPoints !== undefined) patch.storyPoints = input.storyPoints;
  if (input.status !== undefined) patch.status = input.status;
  if (input.priority !== undefined) patch.priority = input.priority;
  if (input.assigneeId !== undefined) patch.assigneeId = input.assigneeId;
  await db.update(story).set(patch).where(eq(story.id, id));
  return serializeStory(await findStory(id, projectId));
}

export async function deleteStory(id: string, projectId: string): Promise<void> {
  await findStory(id, projectId);
  await db.delete(story).where(eq(story.id, id));
}

async function activeSprintOr(id: string, projectId: string) {
  const [row] = await db
    .select()
    .from(sprint)
    .where(and(eq(sprint.id, id), eq(sprint.projectId, projectId)))
    .limit(1);
  if (!row) throw new NotFoundError("Sprint not found.");
  if (row.status === SPRINT_STATUSES.CLOSED)
    throw new ForbiddenError("This sprint is closed and locked.");
  return row;
}

export async function assignSprint(id: string, sprintId: string | null, projectId: string) {
  await findStory(id, projectId);
  if (sprintId) await activeSprintOr(sprintId, projectId);
  await db
    .update(story)
    .set({
      sprintId,
      column: sprintId ? SPRINT_COLUMNS.SPRINT_BACKLOG : null,
      updatedAt: new Date(),
    })
    .where(eq(story.id, id));
  return serializeStory(await findStory(id, projectId));
}

export async function moveStory(id: string, column: string, projectId: string) {
  const row = await findStory(id, projectId);
  if (!row.sprintId) throw new ValidationError("Story is not in a sprint.");
  await activeSprintOr(row.sprintId, projectId);
  await db.update(story).set({ column, updatedAt: new Date() }).where(eq(story.id, id));
  return serializeStory(await findStory(id, projectId));
}

// Ensure the single shared project exists. Called once at startup.
import { eq } from "drizzle-orm";
import { db } from "../../config/db.js";
import { DEFAULT_PROJECT_ID, DEFAULT_PROJECT_NAME } from "../../config/constants.js";
import { project } from "./schema.js";

export async function ensureDefaultProject(): Promise<void> {
  const existing = await db
    .select({ id: project.id })
    .from(project)
    .where(eq(project.id, DEFAULT_PROJECT_ID))
    .limit(1);
  if (existing.length > 0) return;
  await db.insert(project).values({
    id: DEFAULT_PROJECT_ID,
    name: DEFAULT_PROJECT_NAME,
    createdAt: new Date(),
  });
}

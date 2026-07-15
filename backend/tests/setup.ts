// Test harness: migrate the throwaway DB once, then reset rows + re-seed the
// shared project before each test so cases are isolated.
import { beforeAll, beforeEach } from "vitest";
import { sql } from "drizzle-orm";
import { migrate } from "drizzle-orm/libsql/migrator";
import { db } from "../src/config/db.js";
import { ensureDefaultProject } from "../src/features/projects/seed.js";

// Child tables first so foreign keys never block the delete.
const TABLES = [
  "ceremony",
  "story",
  "session",
  "account",
  "verification",
  "sprint",
  "project_member",
  "user",
  "project",
] as const;

beforeAll(async () => {
  await migrate(db, { migrationsFolder: "./drizzle" });
});

beforeEach(async () => {
  for (const table of TABLES) {
    await db.run(sql.raw(`DELETE FROM "${table}"`));
  }
  await ensureDefaultProject();
});

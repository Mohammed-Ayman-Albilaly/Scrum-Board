// Sprint lists — created and closed by the Scrum Master. CLOSED = read-only.
import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";
import { project } from "../projects/schema.js";
import { user } from "../../auth/schema.js";

export const sprint = sqliteTable(
  "sprint",
  {
    id: text("id").primaryKey(),
    projectId: text("project_id")
      .notNull()
      .references(() => project.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    goal: text("goal"),
    startDate: integer("start_date", { mode: "timestamp" }),
    endDate: integer("end_date", { mode: "timestamp" }),
    status: text("status").notNull().default("ACTIVE"),
    createdBy: text("created_by")
      .notNull()
      .references(() => user.id),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
  },
  (t) => [index("sprint_project_idx").on(t.projectId, t.status)],
);

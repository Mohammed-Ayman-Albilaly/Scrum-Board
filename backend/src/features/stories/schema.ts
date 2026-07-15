// User stories. In the product backlog: sprintId + column are null, status is
// UNREFINED/READY. Pulled into a sprint: sprintId set, column tracks the
// sub-column (SPRINT_BACKLOG -> UNDER_DEVELOPMENT -> UNDER_TESTING -> DEPLOYED).
import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";
import { project } from "../projects/schema.js";
import { sprint } from "../sprints/schema.js";
import { user } from "../../auth/schema.js";

export const story = sqliteTable(
  "story",
  {
    id: text("id").primaryKey(),
    projectId: text("project_id")
      .notNull()
      .references(() => project.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description"),
    storyPoints: integer("story_points"),
    status: text("status").notNull().default("UNREFINED"),
    sprintId: text("sprint_id").references(() => sprint.id, { onDelete: "set null" }),
    column: text("column"),
    priority: integer("priority").notNull().default(0),
    assigneeId: text("assignee_id").references(() => user.id, { onDelete: "set null" }),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
  },
  (t) => [
    index("story_backlog_idx").on(t.projectId, t.sprintId, t.priority),
    index("story_sprint_col_idx").on(t.sprintId, t.column),
  ],
);

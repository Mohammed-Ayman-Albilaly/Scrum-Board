// A project owns a backlog, sprints, and ceremonies. Users join via
// `project_member`; all board data is scoped to the selected project.
import { sqliteTable, text, integer, primaryKey } from "drizzle-orm/sqlite-core";
import { user } from "../../auth/schema.js";

export const project = sqliteTable("project", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  createdBy: text("created_by"), // null for the seeded shared project
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});

export const projectMember = sqliteTable(
  "project_member",
  {
    projectId: text("project_id")
      .notNull()
      .references(() => project.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  },
  (t) => [primaryKey({ columns: [t.projectId, t.userId] })],
);

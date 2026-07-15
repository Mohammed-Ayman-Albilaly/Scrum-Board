// Ceremony logs (standup / planning / review / retro). Decoupled from sprint
// state so they can be audited independently. Written by the Scrum Master.
import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";
import { project } from "../projects/schema.js";
import { sprint } from "../sprints/schema.js";
import { user } from "../../auth/schema.js";

export const ceremony = sqliteTable(
  "ceremony",
  {
    id: text("id").primaryKey(),
    projectId: text("project_id")
      .notNull()
      .references(() => project.id, { onDelete: "cascade" }),
    sprintId: text("sprint_id").references(() => sprint.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    notes: text("notes"), // legacy freeform note; superseded by structured `details`
    // Per-type structured fields as a JSON string (validated per type on write).
    details: text("details"),
    createdBy: text("created_by")
      .notNull()
      .references(() => user.id),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  },
  (t) => [index("ceremony_project_idx").on(t.projectId, t.type, t.createdAt)],
);

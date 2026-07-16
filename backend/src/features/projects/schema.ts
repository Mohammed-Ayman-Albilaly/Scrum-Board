// A project owns a backlog, sprints, and ceremonies. Users join via
// `project_member`; all board data is scoped to the selected project.
// Roles are PER PROJECT (a member can hold several; permissions = union),
// stored one row per role in `project_member_role`.
import { sqliteTable, text, integer, primaryKey, foreignKey } from "drizzle-orm/sqlite-core";
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

export const projectMemberRole = sqliteTable(
  "project_member_role",
  {
    projectId: text("project_id").notNull(),
    userId: text("user_id").notNull(),
    role: text("role").notNull(), // TEAM_MEMBER | PRODUCT_OWNER | SCRUM_MASTER
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.projectId, t.userId, t.role] }),
    // Roles belong to a membership: deleting the membership removes its roles.
    foreignKey({
      columns: [t.projectId, t.userId],
      foreignColumns: [projectMember.projectId, projectMember.userId],
    }).onDelete("cascade"),
  ],
);

// A project owns a backlog, sprints, and ceremonies. One shared project for now.
import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const project = sqliteTable("project", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});

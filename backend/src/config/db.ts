// Drizzle client over libsql/SQLite. Schema registered for typed relational queries.
import { drizzle } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client";
import { env } from "./env.js";
import * as authSchema from "../auth/schema.js";
import * as projectSchema from "../features/projects/schema.js";
import * as sprintSchema from "../features/sprints/schema.js";
import * as storySchema from "../features/stories/schema.js";
import * as ceremonySchema from "../features/ceremonies/schema.js";

const client = createClient({ url: env.DATABASE_URL });

export const db = drizzle(client, {
  schema: {
    ...authSchema,
    ...projectSchema,
    ...sprintSchema,
    ...storySchema,
    ...ceremonySchema,
  },
});
export type DB = typeof db;

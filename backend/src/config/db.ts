// Drizzle client over libsql/SQLite. Schema registered for typed relational queries.
import { drizzle } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client";
import { env } from "./env.js";
import * as authSchema from "../auth/schema.js";

const client = createClient({ url: env.DATABASE_URL });

export const db = drizzle(client, { schema: { ...authSchema } });
export type DB = typeof db;

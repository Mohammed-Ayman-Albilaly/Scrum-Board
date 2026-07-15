// Apply generated Drizzle migrations. Run via `pnpm db:migrate` (dev + deploy).
import { migrate } from "drizzle-orm/libsql/migrator";
import { db } from "./db.js";

migrate(db, { migrationsFolder: "./drizzle" })
  .then(() => {
    console.log("Migrations applied.");
    process.exit(0);
  })
  .catch((err: unknown) => {
    console.error("[migrate] failed:", err);
    process.exit(1);
  });

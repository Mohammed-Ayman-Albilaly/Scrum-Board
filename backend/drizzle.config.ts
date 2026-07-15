import { defineConfig } from "drizzle-kit";

// Glob picks up every feature's schema.ts as the app grows.
export default defineConfig({
  dialect: "sqlite",
  schema: "./src/**/schema.ts",
  out: "./drizzle",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "file:./dev.db",
  },
});

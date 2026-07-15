// Validate environment variables at startup. On failure: log and process.exit(1).
// No silent fallbacks for security-critical values (SESSION_SECRET, DATABASE_URL).
import { config } from "dotenv";
import { Type } from "@sinclair/typebox";
import { Value } from "@sinclair/typebox/value";

config(); // load backend/.env into process.env before we read it

const EnvSchema = Type.Object({
  NODE_ENV: Type.Union([
    Type.Literal("development"),
    Type.Literal("production"),
    Type.Literal("test"),
  ]),
  DATABASE_URL: Type.String({ minLength: 1 }),
  SESSION_SECRET: Type.String({ minLength: 32 }),
  PORT: Type.Integer({ minimum: 1, maximum: 65535 }),
});

function loadEnv() {
  const raw = {
    NODE_ENV: process.env.NODE_ENV ?? "development",
    DATABASE_URL: process.env.DATABASE_URL,
    SESSION_SECRET: process.env.SESSION_SECRET,
    PORT: Number(process.env.PORT ?? 3000),
  };
  if (!Value.Check(EnvSchema, raw)) {
    const details = [...Value.Errors(EnvSchema, raw)]
      .map((e) => `${e.path || "/"}: ${e.message}`)
      .join("; ");
    console.error(`[env] Invalid environment configuration — ${details}`);
    process.exit(1);
  }
  return Value.Decode(EnvSchema, raw);
}

export const env = loadEnv();
export const isProd = env.NODE_ENV === "production";

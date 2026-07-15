import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    setupFiles: ["./tests/setup.ts"],
    // Test-only env so config/env.ts validates and points at a throwaway DB.
    // dotenv (in env.ts) does not override already-set vars, so these win.
    env: {
      NODE_ENV: "test",
      DATABASE_URL: "file:./test.db",
      SESSION_SECRET: "test-session-secret-at-least-32-characters",
      PORT: "3001",
    },
    // Test files share one SQLite file; run them serially to avoid contention.
    fileParallelism: false,
  },
});

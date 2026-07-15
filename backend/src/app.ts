// Builds the Express app (middleware + routes). No listen() here so tests can
// import it directly; index.ts owns the network binding.
import express, { type Express } from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { isProd } from "./config/env.js";
import { securityHeaders } from "./middleware/securityHeaders.js";
import { requestLogger } from "./middleware/requestLogger.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { authRoutes } from "./auth/routes.js";
import { boardRoutes } from "./features/board/routes.js";
import { storyRoutes } from "./features/stories/routes.js";
import { sprintRoutes } from "./features/sprints/routes.js";
import { ceremonyRoutes } from "./features/ceremonies/routes.js";
import { userRoutes } from "./features/users/routes.js";

const frontendDir = path.resolve(
  fileURLToPath(new URL("../../frontend/public", import.meta.url)),
);

export function createApp(): Express {
  const app = express();

  app.disable("x-powered-by");
  // Behind a PaaS TLS proxy, trust the first hop so req.ip (rate-limit key) and
  // req.secure reflect the real client instead of the proxy.
  if (isProd) app.set("trust proxy", 1);

  app.use(securityHeaders);
  app.use(requestLogger);
  app.use(express.json({ limit: "16kb" }));

  app.get("/health", (_req, res) => {
    res.json({ ok: true });
  });
  app.use("/auth", authRoutes);
  app.use("/board", boardRoutes);
  app.use("/stories", storyRoutes);
  app.use("/sprints", sprintRoutes);
  app.use("/ceremonies", ceremonyRoutes);
  app.use("/users", userRoutes);

  // Serve the vanilla frontend (index.html, styles, scripts).
  app.use(express.static(frontendDir));

  app.use(errorHandler);
  return app;
}

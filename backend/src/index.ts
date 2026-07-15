// App entry — registers middleware, mounts routes, serves the frontend, listens.
import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { env, isProd } from "./config/env.js";
import { securityHeaders } from "./middleware/securityHeaders.js";
import { requestLogger } from "./middleware/requestLogger.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { authRoutes } from "./auth/routes.js";

const app = express();
const frontendDir = path.resolve(
  fileURLToPath(new URL("../../frontend/public", import.meta.url)),
);

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

// Serve the vanilla frontend (index.html, styles, scripts).
app.use(express.static(frontendDir));

app.use(errorHandler);

app.listen(env.PORT, () => {
  console.log(`ScrumBoard API listening on http://localhost:${env.PORT}`);
});

export { app };

// Log method + path + status + duration. Never logs bodies, PII, or secrets.
import type { Request, Response, NextFunction } from "express";
import { env } from "../config/env.js";

export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  if (env.NODE_ENV === "test") return next(); // keep test output clean
  const start = Date.now();
  res.on("finish", () => {
    console.log(`${req.method} ${req.path} ${res.statusCode} ${Date.now() - start}ms`);
  });
  next();
}

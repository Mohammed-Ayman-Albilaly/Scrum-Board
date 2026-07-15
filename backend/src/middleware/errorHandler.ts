// Catch-all error handler. Maps AppErrors to responses; never leaks internals/secrets.
import type { Request, Response, NextFunction } from "express";
import { AppError } from "../lib/errors.js";
import { sendError } from "../lib/response.js";
import { isProd } from "../config/env.js";

// eslint-disable-next-line @typescript-eslint/no-unused-vars -- Express needs 4 args
export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): Response {
  if (err instanceof AppError) {
    return sendError(res, err.statusCode, err.code, err.message);
  }
  const message = err instanceof Error ? err.message : "unknown error";
  console.error(`[error] ${message}`);
  return sendError(
    res,
    500,
    "INTERNAL_ERROR",
    isProd ? "Something went wrong." : message,
  );
}

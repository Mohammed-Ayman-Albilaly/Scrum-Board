// Read a required path parameter as a definite string (satisfies
// noUncheckedIndexedAccess) or fail with a 400.
import type { Request } from "express";
import { ValidationError } from "./errors.js";

export function param(req: Request, name: string): string {
  const value = req.params[name];
  if (typeof value !== "string" || value.length === 0) {
    throw new ValidationError(`Missing path parameter: ${name}.`);
  }
  return value;
}

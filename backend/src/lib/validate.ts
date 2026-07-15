// Validate a request body against a TypeBox schema. Strips unknown keys first
// (prevents mass assignment), then checks. Throws ValidationError on failure.
import type { Static, TSchema } from "@sinclair/typebox";
import { Value } from "@sinclair/typebox/value";
import { ValidationError } from "./errors.js";

export function parseBody<T extends TSchema>(schema: T, body: unknown): Static<T> {
  if (typeof body !== "object" || body === null) {
    throw new ValidationError("Request body must be a JSON object.");
  }
  const cleaned = Value.Clean(schema, { ...(body as Record<string, unknown>) });
  if (!Value.Check(schema, cleaned)) {
    const first = [...Value.Errors(schema, cleaned)][0];
    const where = first?.path ? first.path.replace(/^\//, "") : "body";
    throw new ValidationError(`${where}: ${first?.message ?? "is invalid"}.`);
  }
  return cleaned as Static<T>;
}

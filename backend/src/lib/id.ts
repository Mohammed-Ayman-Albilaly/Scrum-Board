import { randomUUID } from "node:crypto";

/** Generate a random id for a new row. */
export function newId(): string {
  return randomUUID();
}

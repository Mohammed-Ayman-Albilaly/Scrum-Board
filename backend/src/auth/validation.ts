// TypeBox request schemas for auth endpoints. Server-side validation is authoritative.
import { Type, type Static } from "@sinclair/typebox";
import { ROLE_VALUES, SPECIALIZATION_VALUES } from "../config/constants.js";

// Pattern (not `format`) so validation works without registering TypeBox formats.
const EMAIL_PATTERN = "^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$";

export const SignupSchema = Type.Object({
  name: Type.String({ minLength: 1, maxLength: 120 }),
  email: Type.String({ pattern: EMAIL_PATTERN, maxLength: 254 }),
  password: Type.String({ minLength: 8, maxLength: 128 }),
  role: Type.Union(ROLE_VALUES.map((r) => Type.Literal(r))),
  specialization: Type.Optional(
    Type.Union(SPECIALIZATION_VALUES.map((s) => Type.Literal(s))),
  ),
});
export type SignupInput = Static<typeof SignupSchema>;

export const LoginSchema = Type.Object({
  email: Type.String({ pattern: EMAIL_PATTERN, maxLength: 254 }),
  password: Type.String({ minLength: 1, maxLength: 128 }),
});
export type LoginInput = Static<typeof LoginSchema>;

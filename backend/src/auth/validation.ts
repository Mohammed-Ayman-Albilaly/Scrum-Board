// TypeBox request schemas for auth endpoints. Server-side validation is authoritative.
import { Type, type Static } from "@sinclair/typebox";

// Pattern (not `format`) so validation works without registering TypeBox formats.
const EMAIL_PATTERN = "^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$";

// No role/specialization at signup — roles are assigned per project by that
// project's Scrum Master; specialization is edited later on the profile.
export const SignupSchema = Type.Object({
  name: Type.String({ minLength: 1, maxLength: 120 }),
  email: Type.String({ pattern: EMAIL_PATTERN, maxLength: 254 }),
  password: Type.String({ minLength: 8, maxLength: 128 }),
});
export type SignupInput = Static<typeof SignupSchema>;

export const LoginSchema = Type.Object({
  email: Type.String({ pattern: EMAIL_PATTERN, maxLength: 254 }),
  password: Type.String({ minLength: 1, maxLength: 128 }),
});
export type LoginInput = Static<typeof LoginSchema>;

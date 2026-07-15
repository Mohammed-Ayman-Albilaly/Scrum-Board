// TypeBox request schemas for project management endpoints.
import { Type, type Static } from "@sinclair/typebox";

const EMAIL_PATTERN = "^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$";

export const CreateProjectSchema = Type.Object({
  name: Type.String({ minLength: 1, maxLength: 120 }),
});
export type CreateProjectInput = Static<typeof CreateProjectSchema>;

export const AddMemberSchema = Type.Object({
  email: Type.String({ pattern: EMAIL_PATTERN, maxLength: 254 }),
});
export type AddMemberInput = Static<typeof AddMemberSchema>;

// TypeBox request schemas for project management endpoints.
import { Type, type Static } from "@sinclair/typebox";
import { ROLE_VALUES } from "../../config/constants.js";

const EMAIL_PATTERN = "^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$";

// One-or-more distinct project roles (multi-role membership).
const RolesArray = Type.Array(Type.Union(ROLE_VALUES.map((r) => Type.Literal(r))), {
  minItems: 1,
  maxItems: ROLE_VALUES.length,
  uniqueItems: true,
});

export const CreateProjectSchema = Type.Object({
  name: Type.String({ minLength: 1, maxLength: 120 }),
});
export type CreateProjectInput = Static<typeof CreateProjectSchema>;

export const AddMemberSchema = Type.Object({
  email: Type.String({ pattern: EMAIL_PATTERN, maxLength: 254 }),
  roles: Type.Optional(RolesArray),
});
export type AddMemberInput = Static<typeof AddMemberSchema>;

export const SetRolesSchema = Type.Object({
  roles: RolesArray,
});
export type SetRolesInput = Static<typeof SetRolesSchema>;

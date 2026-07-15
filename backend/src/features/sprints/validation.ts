import { Type, type Static } from "@sinclair/typebox";

export const CreateSprintSchema = Type.Object({
  name: Type.String({ minLength: 1, maxLength: 120 }),
  goal: Type.Optional(Type.String({ maxLength: 2000 })),
  // ISO 8601 date strings; parsed and validated in logic.
  startDate: Type.Optional(Type.String({ maxLength: 40 })),
  endDate: Type.Optional(Type.String({ maxLength: 40 })),
});
export type CreateSprintInput = Static<typeof CreateSprintSchema>;

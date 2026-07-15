import { Type, type Static } from "@sinclair/typebox";
import { CEREMONY_TYPE_VALUES } from "../../config/constants.js";

export const CreateCeremonySchema = Type.Object({
  type: Type.Union(CEREMONY_TYPE_VALUES.map((t) => Type.Literal(t))),
  notes: Type.Optional(Type.String({ maxLength: 10_000 })),
  sprintId: Type.Optional(Type.String({ minLength: 1, maxLength: 64 })),
});
export type CreateCeremonyInput = Static<typeof CreateCeremonySchema>;

// TypeBox request schemas for the users feature.
import { Type, type Static } from "@sinclair/typebox";
import { SPECIALIZATION_VALUES } from "../../config/constants.js";

export const UpdateProfileSchema = Type.Object({
  specialization: Type.Union([
    ...SPECIALIZATION_VALUES.map((s) => Type.Literal(s)),
    Type.Null(),
  ]),
});
export type UpdateProfileInput = Static<typeof UpdateProfileSchema>;

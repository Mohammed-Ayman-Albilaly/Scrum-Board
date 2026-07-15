import { Type, type Static } from "@sinclair/typebox";
import { CEREMONY_TYPE_VALUES } from "../../config/constants.js";

const TEXT = { maxLength: 5000 } as const;

// One flat schema holding every per-type field. `createCeremony` keeps only the
// fields that belong to the submitted `type`; unknown keys are stripped by
// parseBody. Per-type shape:
//   STANDUP  -> blockers
//   PLANNING -> goal, committedPoints, capacity
//   REVIEW   -> demoSummary, feedback
//   RETRO    -> wentWell, needsImprovement, actionItems
export const CreateCeremonySchema = Type.Object({
  type: Type.Union(CEREMONY_TYPE_VALUES.map((t) => Type.Literal(t))),
  sprintId: Type.Optional(Type.String({ minLength: 1, maxLength: 64 })),
  blockers: Type.Optional(Type.String(TEXT)),
  goal: Type.Optional(Type.String({ maxLength: 2000 })),
  committedPoints: Type.Optional(Type.Integer({ minimum: 0, maximum: 100_000 })),
  capacity: Type.Optional(Type.String({ maxLength: 2000 })),
  demoSummary: Type.Optional(Type.String(TEXT)),
  feedback: Type.Optional(Type.String(TEXT)),
  wentWell: Type.Optional(Type.String(TEXT)),
  needsImprovement: Type.Optional(Type.String(TEXT)),
  actionItems: Type.Optional(Type.String(TEXT)),
});
export type CreateCeremonyInput = Static<typeof CreateCeremonySchema>;

// Which fields each ceremony type persists, in display order. `number` fields
// are stored as-is; the rest are HTML-sanitized text.
export const CEREMONY_TEXT_FIELDS = {
  STANDUP: ["blockers"],
  PLANNING: ["goal", "capacity"],
  REVIEW: ["demoSummary", "feedback"],
  RETRO: ["wentWell", "needsImprovement", "actionItems"],
} as const;

// TypeBox schemas for story mutations (Product Backlog + sprint moves).
import { Type, type Static } from "@sinclair/typebox";
import { STORY_STATUS_VALUES, SPRINT_COLUMN_VALUES } from "../../config/constants.js";

export const CreateStorySchema = Type.Object({
  title: Type.String({ minLength: 1, maxLength: 200 }),
  description: Type.Optional(Type.String({ maxLength: 5000 })),
  storyPoints: Type.Optional(Type.Integer({ minimum: 0, maximum: 100 })),
  status: Type.Optional(Type.Union(STORY_STATUS_VALUES.map((s) => Type.Literal(s)))),
  priority: Type.Optional(Type.Integer({ minimum: 0, maximum: 1_000_000 })),
  assigneeId: Type.Optional(Type.String({ minLength: 1, maxLength: 64 })),
});
export type CreateStoryInput = Static<typeof CreateStorySchema>;

export const UpdateStorySchema = Type.Partial(CreateStorySchema);
export type UpdateStoryInput = Static<typeof UpdateStorySchema>;

// Team Member / PO moving a story between a sprint's sub-columns.
export const MoveStorySchema = Type.Object({
  column: Type.Union(SPRINT_COLUMN_VALUES.map((c) => Type.Literal(c))),
});
export type MoveStoryInput = Static<typeof MoveStorySchema>;

// PO pulling a story into a sprint (sprintId) or back to the backlog (null).
export const AssignSprintSchema = Type.Object({
  sprintId: Type.Union([Type.String({ minLength: 1, maxLength: 64 }), Type.Null()]),
});
export type AssignSprintInput = Static<typeof AssignSprintSchema>;

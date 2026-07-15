// Shared enums used across features. Roles drive server-side RBAC.

export const ROLES = {
  TEAM_MEMBER: "TEAM_MEMBER",
  PRODUCT_OWNER: "PRODUCT_OWNER",
  SCRUM_MASTER: "SCRUM_MASTER",
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];
export const ROLE_VALUES = Object.values(ROLES) as Role[];

// Team Member disciplines — fixed enum, server-validated.
export const SPECIALIZATIONS = {
  BACKEND: "BACKEND",
  FRONTEND: "FRONTEND",
  UI_UX: "UI_UX",
  QA: "QA",
  DEVOPS: "DEVOPS",
} as const;

export type Specialization = (typeof SPECIALIZATIONS)[keyof typeof SPECIALIZATIONS];
export const SPECIALIZATION_VALUES = Object.values(SPECIALIZATIONS) as Specialization[];

// Product-backlog refinement status (PRD: Unrefined / Ready).
export const STORY_STATUSES = {
  UNREFINED: "UNREFINED",
  READY: "READY",
} as const;
export type StoryStatus = (typeof STORY_STATUSES)[keyof typeof STORY_STATUSES];
export const STORY_STATUS_VALUES = Object.values(STORY_STATUSES) as StoryStatus[];

// The four fixed sub-columns inside every sprint, in workflow order.
export const SPRINT_COLUMNS = {
  SPRINT_BACKLOG: "SPRINT_BACKLOG",
  UNDER_DEVELOPMENT: "UNDER_DEVELOPMENT",
  UNDER_TESTING: "UNDER_TESTING",
  DEPLOYED: "DEPLOYED",
} as const;
export type SprintColumn = (typeof SPRINT_COLUMNS)[keyof typeof SPRINT_COLUMNS];
export const SPRINT_COLUMN_VALUES = Object.values(SPRINT_COLUMNS) as SprintColumn[];

// Sprint lifecycle. A CLOSED sprint is read-only.
export const SPRINT_STATUSES = {
  ACTIVE: "ACTIVE",
  CLOSED: "CLOSED",
} as const;
export type SprintStatus = (typeof SPRINT_STATUSES)[keyof typeof SPRINT_STATUSES];
export const SPRINT_STATUS_VALUES = Object.values(SPRINT_STATUSES) as SprintStatus[];

// The four Scrum ceremonies a Scrum Master can log.
export const CEREMONY_TYPES = {
  STANDUP: "STANDUP",
  PLANNING: "PLANNING",
  REVIEW: "REVIEW",
  RETRO: "RETRO",
} as const;
export type CeremonyType = (typeof CEREMONY_TYPES)[keyof typeof CEREMONY_TYPES];
export const CEREMONY_TYPE_VALUES = Object.values(CEREMONY_TYPES) as CeremonyType[];

// Single shared project for now (PRD: data scoped to a shared team project).
// Multi-project support can layer on top of this id later.
export const DEFAULT_PROJECT_ID = "default-project";
export const DEFAULT_PROJECT_NAME = "Team Project";

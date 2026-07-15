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

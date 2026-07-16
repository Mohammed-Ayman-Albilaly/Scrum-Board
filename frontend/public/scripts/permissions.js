// Advisory role checks — the server enforces the real rules. Used to show/hide
// controls only. Mirrors the RBAC table in CLAUDE.md.

export const ROLES = {
  TEAM_MEMBER: "TEAM_MEMBER",
  PRODUCT_OWNER: "PRODUCT_OWNER",
  SCRUM_MASTER: "SCRUM_MASTER",
};

// Each predicate takes the user's roles for the ACTIVE project (an array —
// users can hold several roles per project; permissions are the union).
const has = (roles, role) => Array.isArray(roles) && roles.includes(role);

export const can = {
  editBacklog: (roles) => has(roles, ROLES.PRODUCT_OWNER),
  assignSprint: (roles) => has(roles, ROLES.PRODUCT_OWNER),
  assignStory: (roles) => has(roles, ROLES.PRODUCT_OWNER),
  manageSprints: (roles) => has(roles, ROLES.SCRUM_MASTER),
  logCeremonies: (roles) => has(roles, ROLES.SCRUM_MASTER),
  manageMembers: (roles) => has(roles, ROLES.SCRUM_MASTER),
  moveStory: (roles) => has(roles, ROLES.PRODUCT_OWNER) || has(roles, ROLES.TEAM_MEMBER),
};

export const SPECIALIZATION_LABELS = {
  BACKEND: "Backend",
  FRONTEND: "Frontend",
  UI_UX: "UI/UX",
  QA: "QA",
  DEVOPS: "DevOps",
};

export const ROLE_LABELS = {
  TEAM_MEMBER: "Team Member",
  PRODUCT_OWNER: "Product Owner",
  SCRUM_MASTER: "Scrum Master",
};

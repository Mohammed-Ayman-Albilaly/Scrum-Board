// Advisory role checks — the server enforces the real rules. Used to show/hide
// controls only. Mirrors the RBAC table in CLAUDE.md.

export const ROLES = {
  TEAM_MEMBER: "TEAM_MEMBER",
  PRODUCT_OWNER: "PRODUCT_OWNER",
  SCRUM_MASTER: "SCRUM_MASTER",
};

export const can = {
  editBacklog: (role) => role === ROLES.PRODUCT_OWNER,
  assignSprint: (role) => role === ROLES.PRODUCT_OWNER,
  manageSprints: (role) => role === ROLES.SCRUM_MASTER,
  logCeremonies: (role) => role === ROLES.SCRUM_MASTER,
  moveStory: (role) => role === ROLES.PRODUCT_OWNER || role === ROLES.TEAM_MEMBER,
};

export const ROLE_LABELS = {
  TEAM_MEMBER: "Team Member",
  PRODUCT_OWNER: "Product Owner",
  SCRUM_MASTER: "Scrum Master",
};

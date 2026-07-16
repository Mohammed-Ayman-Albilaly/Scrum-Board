# Security Review — Per-Project Roles

**Stage 3 of the Commit-as-Contract workflow.**
Scope: the per-project role model as committed in
`feat: per-project roles UI (...)` and `feat: per-project roles (API +
migration 0004)` — `project_member_role` table, `requireProjectMember` /
`requireRole` refactor, SM-only invite + `PATCH
/projects/:id/members/:userId/roles`, role-less signup.

Reviewed for: privilege escalation, cross-project authority leaks, mass
assignment, input validation, injection, CSRF, rate limiting, data migration
integrity.

---

## Findings

### 1. Signup role smuggling — verified closed — **High-value check, no defect**

The old signup accepted `role` from the client. After the refactor a client
could still SEND `role`/`specialization` keys; two independent layers strip
them: `parseBody`'s `Value.Clean` removes unknown keys before validation, and
Better Auth's `additionalFields` no longer declares `role` at all (and
`specialization` is `input: false`). Covered by
`auth.test.ts › ignores role/specialization smuggled into the signup body`
(201, no `role` property, `specialization: null`). No fix needed — recorded
because this is the refactor's most likely regression point.

## Reviewed and acceptable

- **Cross-project escalation.** `assertScrumMaster` derives the project from
  the `:id` **path param**, never from `?projectId=` or the body, and
  `hasProjectRole` checks membership + role in that exact project. An SM of
  project A calling `POST /projects/B/members` or `PATCH
  /projects/B/members/:uid/roles` gets 403 (asserted in `roles.test.ts`).
- **Self-service escalation.** The only writers of `project_member_role` are:
  signup enrollment (fixed `TEAM_MEMBER`, default project), `createProject`
  (fixed `SCRUM_MASTER`, brand-new project), and the two SM-gated endpoints.
  A non-SM member cannot grant themselves anything (403, tested).
- **requireRole ordering.** `requireRole` now requires `req.projectRoles`;
  if `requireProjectMember` did not run, the check **fails closed**
  (ForbiddenError on `undefined`), never open. All five gate sites sit on
  routers that mount `requireAuth` + `requireProjectMember` first.
- **Union semantics.** `allowed.some(r => held.includes(r))` grants the union
  of held roles and nothing more; roles are validated against the literal
  union (`TEAM_MEMBER|PRODUCT_OWNER|SCRUM_MASTER`), so no unknown role string
  can enter the table via the API (400, tested).
- **Empty role sets.** `RolesArray` enforces `minItems: 1` + `uniqueItems` on
  both invite and role-set bodies — a member cannot be reduced to zero roles
  through the API. (A member with zero rows yields `[]` from
  `getMemberRoles` — still a member for reads, no mutation rights: fails
  closed.)
- **Migration integrity.** 0004's `INSERT…SELECT` runs before the
  `DROP COLUMN`; dry-run verified role-row count == membership count and
  clean column removal. Runs before serve on deploy (`start` script).
- **Injection.** All new queries are Drizzle-parameterized (`eq`/`and`);
  the migration DML contains no user input.
- **CSRF / rate limiting.** Both new/changed mutations carry
  `sameOriginOnly` + `mutationLimiter`; reads are unchanged.
- **Data exposure.** `listProjectMembers` still selects only
  `id/name/specialization` + roles; `GET /projects` adds only the caller's
  own roles. No emails, hashes, or tokens.

## Accepted risks (documented, not patched)

- **SM self-demotion.** An SM may remove their own SCRUM_MASTER role (or an
  SM may demote another SM); a project can end up with no SM, freezing member
  management for that project. Accepted for now — surfaced in the plan; a
  "last SM" guard is a candidate refinement.
- **Fresh-database default project has no SM.** New signups are TEAM_MEMBER
  in the shared project, so on a brand-new install nobody can invite/manage
  roles *there* (existing deployments keep migrated roles). Users can always
  create their own projects (founder = SM). Functional gap, not a
  vulnerability — fails closed.
- **Any SM can grant SM.** Invite/role endpoints let an SM mint further SMs
  in their project — intended by the approved design ("any project Scrum
  Master" manages members).

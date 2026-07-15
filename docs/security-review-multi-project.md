# Security Review — Multi-Project Support

**Stage 3 of the Commit-as-Contract workflow.** Scope: `features/projects/*`
(schema, logic, middleware, routes, validation), the `requireProjectMember`
scoping added to `stories/sprints/ceremonies/board/users` routers, the signup
auto-enrollment in `auth/routes.ts`, and the `?projectId=` wiring in
`frontend/public/scripts/{utils,board}.js`.

Reviewed for: horizontal authorization (cross-project access / IDOR), RBAC,
CSRF, injection, enumeration, and input validation.

---

## Finding — cross-project data access (horizontal privilege escalation) — **High** — FIXED

**Issue.** Introducing multiple projects creates the classic multi-tenant risk:
a user passing another project's id (`?projectId=<other>`) to a board endpoint
could read or mutate a project they do not belong to. Every scoped query already
filters by `projectId`, but without an authorization gate the caller chooses that
id freely.

**Fix.** `requireProjectMember` runs on **every** scoped router (board, stories,
sprints, ceremonies, users) immediately after `requireAuth`. It resolves the
requested `projectId` (defaulting to the shared project) and rejects the request
with `403 "You are not a member of this project."` unless a `project_member` row
exists for `(projectId, req.user.id)`. Only then is `req.projectId` set and
handed to the logic layer.

**Verification.** `tests/projects.test.ts` asserts that a non-member gets `403`
on `GET /board`, `GET /stories`, and `POST /stories` for another user's project,
and that a project's stories never leak into a different project's board.

---

## Reviewed and acceptable

- **Invite authorization.** `POST /projects/:id/members` checks the requester is
  a member of `:id` before adding anyone (`403` otherwise). Verified in tests.
- **Assignee confinement.** Story assignment now requires the assignee to be a
  member of the story's project (`assertAssigneeMember` → `404`), so a Product
  Owner cannot attach a user from outside the project. Verified in tests.
- **RBAC still applies within a project.** Membership is necessary but not
  sufficient: role guards (`requireRole`) remain on every mutation, so a Team
  Member in a project still cannot create stories, etc. Global `user.role`
  applies inside each project (documented design for the MVP).
- **CSRF / rate limiting.** Project create + invite carry `sameOriginOnly` and
  `mutationLimiter`. No finding.
- **Injection.** All membership/board queries are Drizzle-parameterized
  (`eq(...)`, `innerJoin(...)`); `projectId` is bound, never interpolated. The
  `project_member` PK `(project_id, user_id)` makes memberships unique. No finding.
- **Input validation.** `name` (1–120) and invite `email` (pattern, ≤254) are
  TypeBox-validated; unknown keys are stripped by `parseBody`. No finding.
- **Client scoping is advisory.** `utils.api()` appends `?projectId=`, but the
  server authorizes independently — a tampered client cannot reach a project the
  user is not a member of. No finding.

## Accepted risk (low)

- **Invite email enumeration.** Inviting an unregistered address returns
  `404 "No user with that email."`, revealing whether an email has an account.
  Accepted for the MVP (invites are member-only and rate-limited); revisit with
  token-based email invitations if the threat model tightens.
- **Any member may invite.** There is no per-project owner/admin role, so any
  member can add another existing user. Acceptable for a small trusted team;
  a per-project role would layer on top of `project_member` later.

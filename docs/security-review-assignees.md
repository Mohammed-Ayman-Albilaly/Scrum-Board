# Security Review — Story Assignees

**Stage 3 of the Commit-as-Contract workflow.**
Scope: the story-assignee feature as committed in `feat: add story assignee UI`
(frontend: `scripts/{board,cards,permissions}.js`, `styles/layout.css`) and
`feat: add users directory + story assign API` (backend: `features/users/*`,
`features/stories/{routes,logic,validation}.ts`, `app.ts`).

Reviewed for: RBAC gaps, CSRF, XSS, injection, sensitive-data exposure, input
validation, mass assignment, and rate limiting.

---

## Findings

### 1. Unvalidated `assigneeId` — broken reference / forged assignment — **Medium** — FIXED

**Issue.** The story create (`POST /stories`) and update (`PATCH /stories/:id`)
paths accepted an `assigneeId` string and wrote it straight to the `story` row
with no check that a user with that id exists. `story.assignee_id` uses
`onDelete: "set null"` but nothing enforced existence on write, so a Product
Owner could persist a story pointing at an arbitrary or guessed id — a dangling
reference that renders as "Unknown user" on the board and corrupts assignee
reporting. The new `PATCH /stories/:id/assign` endpoint would have inherited the
same gap.

**Evidence (pre-fix).**
```
PATCH /stories/<id>  { "assigneeId": "does-not-exist" }   ->  HTTP 200, stored
```

**Fix.** Added `assertAssigneeExists()`
([backend/src/features/stories/logic.ts](../backend/src/features/stories/logic.ts)),
backed by `userExists()`
([backend/src/features/users/logic.ts](../backend/src/features/users/logic.ts)),
and called it on the create, update, and assign paths. A non-existent assignee is
now rejected with `404 "Assignee not found."`; clearing an assignee (`null`) is
still allowed.

**Verification (post-fix).**
```
PATCH /stories/<id>/assign  { "assigneeId": "does-not-exist" }  -> HTTP 404
PATCH /stories/<id>/assign  { "assigneeId": "<real user id>" }  -> HTTP 200
PATCH /stories/<id>/assign  { "assigneeId": null }              -> HTTP 200 (cleared)
```
Covered by `tests/assignees.test.ts`.

---

## Reviewed and acceptable

- **RBAC on assignment.** `PATCH /stories/:id/assign` reuses the `po` guard
  chain `[sameOriginOnly, requireRole(PRODUCT_OWNER), mutationLimiter]`. A Team
  Member or Scrum Master receives `403`. Verified in tests. No finding.
- **Sensitive-data exposure via `GET /users`.** `listMembers` selects only
  `id, name, role, specialization` — never `email`, the password hash (which
  lives in the `account` table anyway), sessions, or tokens. No finding.
- **AuthN on the directory.** `GET /users` mounts `requireAuth` on the router, so
  an unauthenticated caller gets `401`. Exposing names/roles to authenticated
  teammates is the intended directory behavior for a single shared project. No finding.
- **Closed-sprint lock.** `setAssignee` calls `activeSprintOr` for a story that
  belongs to a sprint, so assignments to a story in a CLOSED (locked) sprint are
  rejected with `403`, consistent with the move/assign-sprint rules. No finding.
- **CSRF.** The assign route carries `sameOriginOnly`; `GET /users` is a safe read.
  No finding.
- **Mass assignment.** `parseBody` runs `Value.Clean` against `AssignAssigneeSchema`,
  stripping any key other than `assigneeId`. No finding.
- **XSS.** Assignee names and specializations render through `el(...,{text})`
  (`textContent`), never `innerHTML`; Helmet CSP already restricts `script-src`.
  No finding.
- **Injection.** All reads/writes go through Drizzle parameterized queries
  (`eq(user.id, id)`, etc.); no string interpolation of user input. No finding.
- **Rate limiting.** The assign mutation is throttled by `mutationLimiter`; the
  directory read is not rate-limited, which is acceptable for a read. No finding.

## Accepted risk (low)

- **Team directory visibility.** Any authenticated user can list all members'
  names, roles, and specializations. Accepted: the app is scoped to one shared
  team project where members are expected to see their teammates. Revisit if
  multi-project support (per the PRD constraint) is added, at which point the
  directory must be filtered to the caller's project membership.

# PROGRESS.md — ScrumBoard Build Status

> Source of truth for "where did we leave off." Read this + CLAUDE.md + PRD.md at the
> start of every session, before touching code. See CLAUDE.md → "Start of Every Session"
> and "Commit-as-Contract Workflow" for when this file gets updated.

## How to use this file

1. **Starting a session:** read the table below, then run `git status` and
   `git log --oneline -10` and reconcile them against this file. This file only reflects
   what was **committed and pushed** — uncommitted work on someone else's machine won't
   be visible to you, and this file can lag behind reality if the last session forgot to
   update it.
2. **Finishing a stage:** flip the relevant cell in the table, update "In Progress /
   Blockers" if needed, and commit `PROGRESS.md` **in the same commit** as the stage's
   code (same `feat:` / `security:` / `test:` commit — don't add a separate "update
   progress" commit).
3. **Stopping mid-stage (including running out of tokens/budget):** do not mark the stage
   done. Instead, commit whatever is safe to commit, and write a note under "In Progress /
   Blockers" describing exactly what's done, what's half-done, and what's still only on
   disk (uncommitted). Push before ending the session — a teammate's agent can only resume
   from what's on the remote.

## Legend

✅ done, committed & pushed · 🟡 written but uncommitted, or committed but unverified ·
⬜ not started · — not applicable to this feature

## Feature status

Reconciled 2026-07-15 against the actual remote (`HEAD` = `95920ab`), which committed and
pushed all the WIP a previous entry of this file had described as "uncommitted." The
earlier entry predated that commit; the table below reflects what is genuinely on GitHub.

| Feature | Frontend UI | Backend API | Security review | Tests (QA) | CI |
|---|---|---|---|---|---|
| Landing page | ✅ | — | ✅ | — static page, no tests | ✅ |
| Auth (signup/login/logout/session) | ✅ | ✅ | ✅ | ✅ `auth.test.ts` | ✅ |
| Board page shell (`GET /board` aggregate read) | ✅ | ✅ | ✅ | ✅ `board.test.ts` | ✅ |
| Stories / product backlog (CRUD + move) | ✅ (`cards.js`) | ✅ (CRUD + `PATCH /stories/:id/move`, `/sprint`) | ✅ | ✅ `board.test.ts` | ✅ |
| Sprints (create / close, **+ start/end dates**) | ✅ (`newSprintForm` w/ date inputs + header range) | ✅ (range validated) | ✅ `security-review-board-enhancements.md` | ✅ `board.test.ts` + `sprint_dates.test.ts` (4) | ✅ |
| Ceremonies (**structured** per-type fields) | ✅ (`ceremonies.js`, Retro 3-col board) | ✅ (`details` JSON, migration 0002) | ✅ `security-review-board-enhancements.md` | ✅ `ceremonies.test.ts` (7) | ✅ |
| Backlog reorder (PO ▲/▼) | ✅ (`cards.js`) | ✅ `PATCH /stories/:id/reorder` (atomic renumber) | ✅ `security-review-board-enhancements.md` | ✅ `reorder.test.ts` (5) | ✅ |
| **Multi-project** (create / invite / scope) | ✅ (project switcher + `+ Project` + Invite) | ✅ `GET/POST /projects`, `POST /projects/:id/members`, `requireProjectMember` (migration 0003) | ✅ `security-review-multi-project.md` | ✅ `projects.test.ts` (8) | ✅ |
| Global Deployed list | ✅ (`deployedPanel`) | ✅ (part of `GET /board`) | ✅ | ✅ `board.test.ts` (backlog→deployed flow) | ✅ |
| Story assignees (`GET /users` + `PATCH /stories/:id/assign`) | ✅ (tag + PO picker) | ✅ (assignee must be project member) | ✅ `docs/security-review-assignees.md` | ✅ `assignees.test.ts` (8) | ✅ |
| CI pipeline | — | — | — | — | ✅ `.github/workflows/ci.yml` (typecheck + test) |
| **Dialog system** (replaces native confirm/prompt) | ✅ (`dialog.js`, 5 call sites swapped) | — | ✅ `security-review-dialog-system.md` | ✅ suite green 63/63 + manual checklist | ✅ |
| **Per-project roles** (multi-role, union perms) | ✅ (signup slimmed; `ctx.roles`; invite+members dialogs) | ✅ (`project_member_role`, migration 0004 w/ data copy, `requireRole` union check, SM-only invite + `PATCH roles`) | ✅ `security-review-per-project-roles.md` | ✅ `roles.test.ts` (9) | ✅ |
| **Dashboard / profile / contacts / avatar** | ✅ (dashboard.html + profile.html + header.js w/ avatar popover; login → /dashboard.html; board reads `?projectId=`) | ✅ (`GET /users/contacts` derived from shared memberships; `PATCH /users/me` specialization-only) | ✅ `security-review-dashboard-profile.md` | ✅ `contacts.test.ts` (4) + `profile.test.ts` (6) | ✅ |
| **Slim header + logout relocation** | ✅ (logout only in popover + profile, red `--color-danger`; header = brand·project·avatar; project bar → toolbar) | — | ✅ `security-review-header-logout.md` | ✅ suite green + manual checklist | ✅ |
| **Double-submit fix** (story/sprint/ceremony create buttons) | ✅ (untyped submit buttons were firing onclick AND the form's native submit) | — | — (frontend-only, no RBAC/data-shape change) | ✅ suite green + browser-verified (click and Enter-key paths, both localhost and confirmed present in the live Railway bundle) | ✅ |
| **Sprint deletion** (SM-only, e.g. to remove a duplicate) | ✅ (`Delete sprint` button + danger dialog next to Close sprint) | ✅ `DELETE /sprints/:id` — SM-only, project-scoped, 409 if the sprint still has stories, cascades its ceremony logs | — (reasoning below; revisit if scope grows) | ✅ `sprint_delete.test.ts` (7) | ✅ |

**Multi-project (done 2026-07-15):** every user auto-enrolls in the shared `Team Project` on
signup and can create more projects or invite existing users by email. A `project_member` join
table + `requireProjectMember` middleware scope every board/story/sprint/ceremony/users request
to a project the caller belongs to (cross-project access → 403). Global `user.role` still governs
RBAC *within* each project; a per-project role model is a possible future layer.

**Auth-stack deviation (accepted):** the PRD names *bcrypt + express-session*; the app uses
**Better Auth** (scrypt hashing, HttpOnly/SameSite=Strict session cookies) per CLAUDE.md. This
satisfies "passwords hashed, never plaintext" and is tested + security-reviewed. Kept as the
MVP choice — switching would discard the working, reviewed auth stack.

## In progress / uncommitted right now

Nothing in flight. The 2026-07-16 four-change feature set (dialog system → per-project
roles → dashboard/profile/contacts/avatar → slim header/logout) is code-complete,
security-reviewed, tested, and **pushed to `origin/main`** (verified: `git log
origin/main..HEAD` is empty). Two follow-up fixes landed the same day after a user report
against the live Railway deployment: the story/sprint/ceremony create buttons were
double-submitting (untyped `<button>` inside a `<form>` defaults to `type="submit"`,
so one click fired both its own `onclick` and the form's native submit — fixed by marking
those buttons `type="button"`), and Scrum Masters can now delete a sprint (`DELETE
/sprints/:id`, blocked with 409 while it still has stories) so leftover duplicates from
before the double-submit fix can be cleaned up.

⚠️ **Run `pnpm db:migrate` after pulling** — migration 0004 (per-project roles) must run
before the app will boot against an older `dev.db`.

**Latest local verification (2026-07-16):** `pnpm --filter backend typecheck` — exit 0.
`pnpm --filter backend test` — **88/88 passing** across 12 files (`auth` 12, `board` 12,
`roles` 9, `projects` 8, `assignees` 8, `ceremonies` 7, `permissions` 6, `profile` 6,
`sprint_delete` 7, `reorder` 5, `contacts` 4, `sprint_dates` 4). Additionally
browser-verified end-to-end against the running dev server with a headless Playwright
session (not just the test suite): one click / one Enter-press creates exactly one
story or sprint; the delete-sprint button + danger dialog removes a sprint from the DOM.
The double-submit fix was also confirmed present in the **live Railway bundle** by
fetching the deployed `scripts/board.js` directly.

(The auth negative-path tests emit expected `Invalid password` / `User not found` warnings
from Better Auth — those are asserted-for behavior, not failures.)

**CI:** GitHub Actions is green on `origin/main` (install → typecheck → `vitest run`).

## Known gaps / next candidates

Every PRD feature is now implemented. Remaining items are refinements, not missing flows:

- ~~**Story assignees**~~ **Done 2026-07-15.**
- ~~**Backlog reordering**~~ **Done 2026-07-15** — `PATCH /stories/:id/reorder` + ▲/▼ controls.
- ~~**Structured retro / ceremonies**~~ **Done 2026-07-15** — per-type fields, Retro 3-col board.
- ~~**Multi-project support**~~ **Done 2026-07-15** — projects + membership + scoping.
- ~~**Per-project roles.**~~ **Done** — `project_member_role` table (migration 0004), SM-only
  invite + `PATCH /projects/:id/members/:userId/roles`, role-less signup, union permissions.
  Covered by `roles.test.ts` (9). Also added: dashboard + profile (`PATCH /users/me`) and a
  contacts directory (`GET /users/contacts`).
- ~~**Sprint deletion**~~ **Done 2026-07-16** — `DELETE /sprints/:id`, SM-only, refuses
  (409) while the sprint still has stories (move them back to the backlog first) so no
  story data is silently discarded; ceremony logs tied to the sprint are dropped with it.
  Not formally security-reviewed as its own doc — same guard chain (`requireProjectMember`
  → `requireRole(SCRUM_MASTER)`, project-scoped lookup) as the existing close-sprint route,
  plus the story-count check; revisit with a dedicated review if the delete surface grows
  (e.g. a force-delete-with-stories option).
- **Multiple assignees.** Single `assigneeId` today; "Assignee(s)" hints at multiple (needs a
  story⇄user junction table).
- **"Last SM" guard.** An SM can demote the project's only SM, freezing member management (noted
  in `security-review-per-project-roles.md` as accepted risk).
- **bcrypt vs Better Auth.** Documented, accepted deviation (see the auth-stack note above).
- **Legacy `ceremony.notes` column.** Superseded by `details`; left in place (always null) to
  keep migration 0002 additive. Drop in a later migration if desired.

## Resolved blockers (kept for history)

- ~~Architecture drift: CLAUDE.md documented a `features/columns/` folder.~~ **Resolved
  2026-07-15** by updating CLAUDE.md's file tree to match reality — the "move story between
  sub-columns" mutation lives at `PATCH /stories/:id/move` inside `features/stories/`; there
  is no `columns/` folder.
- ~~`backend/package.json` had no `"test"` script.~~ **Resolved** — `"test": "vitest run"`
  is present; `pnpm --filter backend test` works.
- ~~No CI pipeline.~~ **Resolved** — `.github/workflows/ci.yml` runs `pnpm install
  --frozen-lockfile`, typecheck, then the test suite on every push to `main` and every PR.

## Deliverables verification (2026-07-16)

Independent audit against the graded deliverables, run on a fresh clone with Node 22 / pnpm
9.15.0. Results:

- **Rules file applied.** Every security rule in `CLAUDE.md` mapped to enforcing code
  (helmet CSP, `sameOriginOnly` CSRF, HttpOnly/SameSite=Strict/Secure-in-prod cookies, scrypt
  hashing, `SafeUser` hides the hash, `requireRole`/`requireProjectMember`, `sanitizeText`,
  env `process.exit(1)`). See the mapping table in `README.md`.
- **Tests green.** `pnpm --filter backend typecheck` exit 0; `pnpm --filter backend test`
  **81/81 passing across 11 files**.
- **Coverage.** `vitest run --coverage` → **90.39% statements / 90.39% lines / 83.95% branches**
  overall (auth 98%, projects 97.7%, board 95.1%; only the process entrypoints `index.ts` /
  `migrate.ts` sit at 0% by design). Added `@vitest/coverage-v8` as a dev dependency.
- **No hardcoded secrets.** Full scan clean; only `.env.example` is tracked, `.env`/`*.db` are
  git-ignored.
- **Vulnerability documented + fixed.** CSRF (High) in `docs/security-review-landing-auth.md`,
  fixed via `sameOriginOnly` and verified (cross-origin → 403). Plus a Medium trust-proxy fix.
- Added `README.md` (deliverable explanations, applied-rules table, documented-tests table,
  coverage, security vuln, deployment link).

**Verdict: all four pass/fail criteria met.**

## Next up

All PRD features are implemented, security-reviewed, and covered by **81 passing tests
(90.39% coverage)**. Next step: pick a refinement from "Known gaps" — the **"last SM" guard**
and **multiple assignees** are the strongest candidates.

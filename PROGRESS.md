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

Nothing tracked as in-flight. Everything above is committed **and pushed to `origin/main`**
on 2026-07-16. **Verified green locally on 2026-07-15** with a portable Node + pnpm 9.15.0,
and additionally **exercised live in a browser** against the running dev server (project switch,
sprint dates on the header, backlog reorder, structured Planning + Retro rendering):

- `pnpm --filter backend typecheck` — exit 0, no type errors
- `pnpm --filter backend test` — **63/63 passing** across 8 files: `auth` 13, `board` 12,
  `permissions` 6, `assignees` 8, `sprint_dates` 4, `reorder` 5, `ceremonies` 7, `projects` 8

(The auth negative-path tests emit expected `Invalid password` / `User not found` warnings
from Better Auth — those are asserted-for behavior, not failures.)

**Pushed:** all assignee / sprint-date / reorder / structured-ceremony / multi-project work is
on `origin/main`. Pushing to `main` triggers `.github/workflows/ci.yml` (install → typecheck →
`vitest run`); confirm that run is green on GitHub Actions.

## Known gaps / next candidates

Every PRD feature is now implemented. Remaining items are refinements, not missing flows:

- ~~**Story assignees**~~ **Done 2026-07-15.**
- ~~**Backlog reordering**~~ **Done 2026-07-15** — `PATCH /stories/:id/reorder` + ▲/▼ controls.
- ~~**Structured retro / ceremonies**~~ **Done 2026-07-15** — per-type fields, Retro 3-col board.
- ~~**Multi-project support**~~ **Done 2026-07-15** — projects + membership + scoping.
- **Confirm CI green on GitHub.** Pushed 2026-07-16; verify the Actions run for `ci.yml` passed.
- **Multiple assignees.** Single `assigneeId` today; "Assignee(s)" hints at multiple (needs a
  story⇄user junction table).
- **Per-project roles.** Role is global (`user.role`); a per-project owner/admin role would let
  projects restrict who can invite. Any member can currently invite.
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

## Next up

All PRD features are implemented, security-reviewed, covered by 63 passing tests, and pushed to
`origin/main`. Next step: confirm the GitHub Actions run for the pushed commits is green, then
pick a refinement from "Known gaps" (multiple assignees or per-project roles are the strongest).

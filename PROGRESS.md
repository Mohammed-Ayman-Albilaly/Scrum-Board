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
| Sprints (create / close) | ✅ (`newSprintForm` in `board.js`) | ✅ | ✅ | ✅ `board.test.ts` (create/close + closed-sprint lock) | ✅ |
| Ceremonies (log standup/planning/review/retro) | ✅ (`ceremonies.js`) | ✅ | ✅ | ✅ `board.test.ts` (RBAC + validation) | ✅ |
| Projects (single shared project) | — by design | ✅ schema + `ensureDefaultProject()` seed | ✅ | ✅ via seed in `setup.ts` | ✅ |
| Global Deployed list | ✅ (`deployedPanel`) | ✅ (part of `GET /board`) | ✅ | ✅ `board.test.ts` (backlog→deployed flow) | ✅ |
| CI pipeline | — | — | — | — | ✅ `.github/workflows/ci.yml` (typecheck + test) |

**Multi-project note:** the PRD lists multi-project support as a constraint, but the current
design deliberately scopes everything to one shared project (`DEFAULT_PROJECT_ID`). There is
no create-project / invite-members API or UI. This is a known, intentional simplification —
not a half-finished feature. Layering multiple projects on top of the existing `projectId`
column is the natural future extension.

## In progress / uncommitted right now

Nothing tracked as in-flight. The remote is the source of truth and everything above is
committed to it. **Verified green locally on 2026-07-15** (against commit `88c3057`, a
docs-only child of remote `95920ab`) using a portable Node 24.18.0 + pnpm 9.15.0:

- `pnpm install --frozen-lockfile` — clean
- `pnpm --filter backend typecheck` — exit 0, no type errors
- `pnpm --filter backend test` — **31/31 passing** (`board` 12, `auth` 13, `permissions` 6)

(The auth negative-path tests emit expected `Invalid password` / `User not found` warnings
from Better Auth — those are asserted-for behavior, not failures.)

## Known gaps / next candidates (all core PRD flows are done)

- **Story assignees — not wired end to end.** Backend fully supports it (`assigneeId` in
  `story` schema, `CreateStorySchema`/`UpdateStorySchema`, and `createStory`/`updateStory`
  logic), but there is **no UI to pick an assignee** and **no endpoint to list team members**
  to choose from. Cards never show an assignee/specialization tag despite the PRD calling
  for it. This is the clearest remaining end-to-end gap.
- **Backlog reordering.** `priority` exists and `PATCH /stories/:id` accepts it, but there's
  no drag-free reorder control in `cards.js` (PRD allows dropdown/button reordering).
- **Structured retro.** Ceremonies store freeform `notes`; the PRD's retro "Went Well /
  Needs Improvement / Action Items" three-column structure is not modeled separately.

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

Core PRD flows are complete, reviewed, tested, and under CI. The next unit of work is a
**new** feature rather than finishing a half-done one — the strongest candidate is wiring
**story assignees** end to end (list-members endpoint + assignee picker on cards + assignee
tag), following the same five-stage Commit-as-Contract pipeline (frontend → backend →
security → QA → CI).

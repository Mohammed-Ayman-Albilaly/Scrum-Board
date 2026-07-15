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

| Feature | Frontend UI | Backend API | Security review | Tests (QA) | CI |
|---|---|---|---|---|---|
| Landing page | ✅ | — | ✅ | ⬜ | ⬜ |
| Auth (signup/login/logout/session) | ✅ | ✅ | ✅ | 🟡 written, not yet run/confirmed green | ⬜ |
| Board page shell (`GET /board` aggregate read) | 🟡 | 🟡 | ⬜ | ⬜ | ⬜ |
| Stories / product backlog (CRUD + move) | 🟡 (`cards.js`) | 🟡 (CRUD + `PATCH /stories/:id/move`, `/sprint`) | ⬜ | ⬜ | ⬜ |
| Sprints (create / close) | ⬜ no dedicated UI yet | 🟡 | ⬜ | ⬜ | ⬜ |
| Ceremonies (log standup/planning/review/retro) | 🟡 (`ceremonies.js`) | 🟡 | ⬜ | ⬜ | ⬜ |
| Projects (create / invite members) | ⬜ | 🟡 schema + seed only — **no routes.ts/logic.ts, no API yet** | ⬜ | ⬜ | ⬜ |
| Global Deployed list | ⬜ | ⬜ not started as its own endpoint | ⬜ | ⬜ | ⬜ |
| CI pipeline | — | — | — | — | ⬜ no `.github/workflows` in repo at all |

## In progress / uncommitted right now

As of 2026-07-15, `git status` shows a large amount of uncommitted work on this machine
that does **not exist on GitHub yet**:

- All of `backend/src/features/` (board, stories, sprints, ceremonies, projects) —
  routes/logic/schema/validation files, uncommitted.
- `backend/tests/` (auth.test.ts, permissions.test.ts, helpers.ts, setup.ts) and
  `backend/vitest.config.ts` — uncommitted, not yet run.
- `frontend/public/board.html` and `scripts/{board,cards,ceremonies,permissions,utils}.js`,
  `styles/layout.css` — uncommitted.
- Modifications to already-committed files: `backend/src/auth/{logic,routes}.ts`,
  `backend/src/config/{constants,db}.ts`, `backend/src/index.ts`, `backend/src/lib/errors.ts`,
  `backend/package.json`, `pnpm-lock.yaml`, `backend/drizzle/meta/_journal.json`.
- New untracked lib/middleware files: `backend/src/app.ts`, `backend/src/lib/{http,id,sanitize,validate}.ts`,
  `backend/src/middleware/rateLimit.ts`, `backend/drizzle/0001_nosy_stardust.sql` +
  `meta/0001_snapshot.json`.

**Before handing off to another machine, this all needs to be committed (through the
proper stage-tagged commits where possible) and pushed — otherwise a teammate's agent
starts from the last pushed commit (`2a2ecf9 security: patch landing page auth`), not
from this state.**

## Blockers / open questions

- **Architecture drift:** CLAUDE.md's file tree documents a separate `features/columns/`
  folder for "move story between sub-columns." The actual implementation puts that
  mutation at `PATCH /stories/:id/move` inside `features/stories/`. Decide whether to
  update CLAUDE.md's diagram to match reality, or refactor into a `columns/` folder —
  don't let the two silently diverge further.
- `backend/package.json` has no `"test"` script yet even though vitest + supertest +
  `tests/` exist. Add one (e.g. `"test": "vitest run"`) so `pnpm test` works and CI can
  call it later.
- No CI pipeline exists yet (stage 5 of the Commit-as-Contract Workflow). Until one is
  set up, treat `pnpm typecheck` + `pnpm test` run locally as the manual stand-in — don't
  mark the CI column ✅ for anything until real CI exists and is green.

## Next up

Whoever resumes: pick the next ⬜/🟡 cell in the table, top to bottom, left to right —
but first commit and push the uncommitted WIP listed above so it isn't lost or
duplicated by two people working from different starting points.

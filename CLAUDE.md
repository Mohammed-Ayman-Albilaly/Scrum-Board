# CLAUDE.md — ScrumBoard AI Session Guide

> Drop this file + PRD.md into your Claude context at the start of every session.
> Every decision here is binding. Override only if the user explicitly says so.

---

## Project Overview

**ScrumBoard** — Scrum-specialized project management app for agile teams.
Supports the full Scrum workflow: shared product backlog, multiple sprint lists each with
four fixed sub-columns (Sprint Backlog → Under Development → Under Testing → Deployed),
and a global read-only Deployed list aggregating all shipped stories.

**Problem Solved:** Agile teams need one place to run Scrum correctly — with server-enforced
role permissions, sprint lifecycle management, and ceremony logging — without building custom tooling.

**Target Audience:** Agile dev teams of 3–15 people familiar with Scrum ceremonies.

**Success Looks Like:**
- Roles are airtight — no permission leaks
- Every DB mutation is parameterized, transactional, and server-checked
- Zero secrets in git; env vars validated at startup; tests green on every commit

---

## Identity

| Token         | Value                                       |
|---------------|---------------------------------------------|
| Primary       | `#0F766E` — teal (Scrum-associated, trust)  |
| Secondary     | `#0D9488` — lighter teal (accents, hover)   |
| Accent        | `#F97316` — orange (deployed, success)      |
| Background    | `#FAFAFA` — near-white                      |
| Heading Font  | Inter (or system-ui fallback)               |
| Body Font     | Inter                                       |
| Visual Style  | Minimal flat. Subtle card shadows. Color-coded status badges. |
| Tone          | Professional, precise. Scrum terminology used exactly. No marketing copy. |

Status badge colors: Unrefined = gray · Ready = blue · Under Dev = orange · Testing = yellow · Deployed = green

---

## Stack

### Backend
| Technology           | Why |
|----------------------|-----|
| Node.js + Express    | Proven, massive community, Claude handles it fluently |
| TypeScript (strict)  | Catches permission/type bugs at dev time; required for all files |
| SQLite via libsql    | Zero DevOps, local-first, sufficient for ≤15 users |
| Drizzle ORM          | Type-safe SQL; Claude writes and reads it accurately; no heavy migrations |
| Better Auth          | Handles sessions, password reset, OAuth; Argon2 hashing built-in |
| TypeBox              | Lightweight schema validation; compiles to JSON Schema |
| express-rate-limit   | Rate-limit mutation endpoints |
| helmet               | Security headers in one line |

### Frontend
| Technology        | Why |
|-------------------|-----|
| Vanilla HTML/CSS/JS | Zero build step. Claude modifies HTML/JS directly, no JSX abstraction. |
| CSS Variables     | Theming without Tailwind; explicit, readable, AI-friendly |
| fetch API         | Async mutations; no extra library needed |

### Auth & Security
- **Session-based auth** (not JWT) — server holds state; client cannot forge tokens
- **Better Auth** — HttpOnly, Secure, SameSite=Strict cookies; no custom auth logic
- **RBAC** — three roles: `TEAM_MEMBER`, `PRODUCT_OWNER`, `SCRUM_MASTER`
  Every mutation endpoint checks `req.user.role` server-side. Frontend hides controls (UX only).

---

## Architecture

**Pattern: Modular Monolith**
Single Express app, feature-scoped folders. Keeps iteration fast, deploys as one unit.
Claude agents work on isolated domains without merge conflicts.

```
scrumboard/
├── backend/
│   ├── src/
│   │   ├── index.ts                    # App entry — registers middleware, mounts routes
│   │   ├── config/
│   │   │   ├── env.ts                  # Validate env vars at startup; exit on failure
│   │   │   ├── db.ts                   # Drizzle + SQLite client
│   │   │   └── constants.ts            # Roles enum, column names, ceremony types
│   │   ├── auth/
│   │   │   ├── schema.ts               # User + session tables (Drizzle)
│   │   │   ├── routes.ts               # POST /auth/signup, /login, /logout
│   │   │   └── middleware.ts           # Session guard + role checker (used by all routes)
│   │   ├── features/
│   │   │   ├── projects/               # Multi-project: schema (project + project_member) · logic · routes
│   │   │   │                           #   (GET/POST /projects, POST /:id/members) · middleware (requireProjectMember) · seed
│   │   │   ├── users/                  # GET /users — project member directory for the assignee picker (routes only)
│   │   │   ├── board/                  # GET /board aggregate read (routes.ts · logic.ts)
│   │   │   ├── stories/                # Backlog CRUD + /move (TM/PO) + /assign + /reorder + /sprint (PO)
│   │   │   ├── sprints/                # Sprint lifecycle incl. goal/start/end dates (SM only for create/close)
│   │   │   └── ceremonies/             # Structured standup/planning/review/retro logs in a `details` JSON col (SM only)
│   │   │       └── [each feature has: schema.ts · routes.ts · logic.ts · validation.ts]
│   │   │       # NOTE: no separate columns/ folder — sub-column moves are PATCH /stories/:id/move in stories/.
│   │   │       # Every board resource router runs requireProjectMember and scopes to ?projectId=.
│   │   ├── lib/
│   │   │   ├── types.ts                # Shared TS interfaces — User, Role, Sprint, Story, etc.
│   │   │   ├── errors.ts               # Custom error classes (AuthError, ValidationError…)
│   │   │   ├── response.ts             # Standard HTTP response wrapper
│   │   │   └── queries.ts              # Shared helpers — pagination, filters, batch lookups
│   │   └── middleware/
│   │       ├── errorHandler.ts         # Catch-all; never log secrets
│   │       ├── requestLogger.ts        # Log method+path+status; no PII or bodies
│   │       └── securityHeaders.ts      # helmet config
│   └── tests/
│       ├── auth.test.ts                # Login, signup, logout, session
│       ├── permissions.test.ts         # Every role tested separately
│       ├── stories.test.ts             # PO-only mutations; TM read-only
│       ├── sprints.test.ts             # SM-only create/close; locked sprints
│       ├── ceremonies.test.ts          # SM-only logging
│       └── db.test.ts                  # Pagination, N+1 checks, index coverage
│
├── frontend/
│   ├── public/
│   │   ├── index.html                  # Landing + login/signup
│   │   ├── board.html                  # Main board: backlog | sprints | deployed
│   │   ├── styles/
│   │   │   ├── main.css                # CSS variables, resets, global rules
│   │   │   ├── layout.css              # Board grid, column widths
│   │   │   └── components.css          # Cards, badges, buttons, forms
│   │   └── scripts/
│   │       ├── auth.js                 # Login/signup/logout handlers
│   │       ├── board.js                # Fetch + render full board
│   │       ├── cards.js                # Move card (PATCH to backend)
│   │       ├── ceremonies.js           # Open/log ceremony panels
│   │       ├── permissions.js          # Show/hide controls by role (advisory; server enforces)
│   │       └── utils.js                # fetch wrapper, error toast, DOM helpers
│
├── .env.example                        # Template — no real secrets ever
├── .gitignore                          # Covers .env, node_modules, dist, *.db, logs, IDE files
├── .npmrc                              # minimum-release-age=10080 (pnpm only)
├── pnpm-workspace.yaml
├── package.json
├── tsconfig.json                       # strict: true, no exceptions
├── PRD.md
├── CLAUDE.md                           # This file
└── PROGRESS.md                         # Build status per feature/stage — read + update every session
```

**Key decisions:**
1. **No API versioning** — internal app; breaking changes block deploys intentionally
2. **No WebSockets** — PRD says "no real-time sync; page refresh reflects state"
3. **Session auth, not JWT** — server-held state; simpler RBAC
4. **SQLite not Postgres** — zero infra; Claude agents iterate faster
5. **Ceremony logs decoupled from sprints** — queried independently; easier to audit

---

## Development with Claude

### Start of Every Session
1. Paste **PRD.md** + **CLAUDE.md** into context
2. Read **PROGRESS.md** — it's the source of truth for what stage every feature is in
3. Run `git status` and `git log --oneline -10`; reconcile against PROGRESS.md before
   trusting it (uncommitted work from another machine or a previous session won't be
   visible in PROGRESS.md until it's pushed and the file is updated)
4. Name the exact page or endpoint you're building
5. State the task explicitly: `"Build the POST /stories endpoint"` or `"Implement the Sprint Backlog column UI"`

### Commit-as-Contract Workflow

Each page/feature goes through **five stages in order**. No shortcuts.

| Stage | Agent | Task | Commit prefix |
|-------|-------|------|---------------|
| 1 | **Frontend (Claude)** | HTML/CSS/JS for one page | `feat: add [page] UI` |
| 2 | **Backend (Claude)** | API endpoints + DB schema | `feat: add [feature] API` |
| 3 | **Security (Claude)** | Review for RBAC gaps, XSS, injection, secrets | `security: patch [page]` |
| 4 | **QA (Claude)** | Write + run tests | `test: add tests for [feature]` |
| 5 | **CI** | Full test suite; block if red | — |

**Next page starts only when all five stages are green.**

**Update PROGRESS.md in the same commit as the stage it records.** Flip that
feature/stage's cell in the table, and if you're stopping mid-stage (including running
out of budget), write a one-line note under "In Progress / Blockers" describing exactly
what's done vs. still uncommitted. Commit and push before ending a session — an agent on
another machine can only resume from what's on the remote, not from this session's
history.

---

## Working Principles for Claude

- **Ask before assuming.** Ambiguous requirement? Write a comment question, don't guess.
- **Explain non-obvious choices.** Routine edits need no narration. Schema changes, new middleware, RBAC additions — one-line rationale required.
- **Flag tradeoffs explicitly.** "I'm using cursor pagination here (better at scale) vs offset (simpler) — confirm?"
- **Mirror existing patterns.** Check how the last route file in the same folder is structured before writing a new one.
- **Clean up on every touch.** Remove unused imports, dead params, leftover console.logs.
- **pnpm only.** Reject npm, yarn, bun. Always.
- **Block new packages < 10 days old.** `minimum-release-age=10080` enforced in `.npmrc`.

---

## Environment & Secrets

```
# backend/.env (never commit this file)
NODE_ENV=development
DATABASE_URL=file:./dev.db
SESSION_SECRET=<min 32 chars, randomly generated>
PORT=3000
```

**Validate at startup** in `backend/src/config/env.ts` — if any var is missing or malformed, log the error and call `process.exit(1)`. No silent fallbacks.

**`.gitignore` must cover:** `.env`, `*.db`, `*.sqlite`, `node_modules/`, `dist/`, `logs/`, `.DS_Store`, `coverage/`

---

## Code Standards

- **TypeScript strict mode everywhere.** No `any` without `// reason:` comment.
- **Null checks explicit.** Never assume a value is non-null without a guard.
- **Shared types in one place:** `backend/src/lib/types.ts` — never duplicate.
- **Functions ≤ 20 lines.** Split helpers if longer.
- **Meaningful names.** `createUserStory()` not `handle()`. `validateSprintClosure()` not `check()`.

---

## Database & Queries

- **Schema in `features/*/schema.ts`.** Drizzle generates migrations — no hand-written SQL files.
- **Parameterized always.** Never concatenate user input into a query string.
- **Select only needed columns.** `SELECT *` is banned.
- **Pagination:** Default 25, max 100. Cursor-based for the Deployed list; offset for ceremony logs.
- **Indexes:** Every column used in `WHERE` / `ORDER BY` / `JOIN`. Composite: most-selective first.
- **No N+1.** Use Drizzle `.with({ relation: true })` or batch lookups.
- **Transactions for multi-step writes.** Moving a story to a sprint = update story + update junction table in one transaction.

---

## Auth & Permissions (server-side always)

| Endpoint | Allowed roles |
|----------|---------------|
| POST /stories | Product Owner |
| PATCH /stories/:id | Product Owner |
| DELETE /stories/:id | Product Owner |
| POST /sprints | Scrum Master |
| PATCH /sprints/:id/close | Scrum Master |
| POST /ceremonies | Scrum Master |
| PATCH /stories/:id/move (sub-column move) | Team Member, Product Owner |
| PATCH /stories/:id/assign (set/clear assignee) | Product Owner |
| PATCH /stories/:id/reorder (backlog priority) | Product Owner |
| POST /projects (create) | Any authenticated (creator auto-joins) |
| POST /projects/:id/members (invite) | Any member of that project |
| GET * (read, incl. GET /users directory) | All authenticated |

**Project scoping (multi-project).** Every board resource (`/board`, `/stories`, `/sprints`,
`/ceremonies`, `/users`) requires `requireProjectMember`: the caller must be a member of the
`?projectId=` project (defaults to the shared `DEFAULT_PROJECT_ID`) or the request is `403`.
Role checks above apply **within** a project; `user.role` is global. New signups auto-enroll in
the shared project. This supersedes the earlier "single shared project" simplification.

**Never return to client:** password hashes · session IDs in JSON body · API tokens · internal IDs not needed by the UI

---

## Input Validation

- **Server-side validation on every endpoint.** Client-side = UX only.
- **TypeBox schema** for request bodies — `Value.Check(schema, body)`; reject on fail.
- **Sanitize HTML** in story descriptions before store/render (`sanitize-html` on backend).
- **Rate-limit** POST /stories, POST /sprints, POST /ceremonies — `express-rate-limit`, 10 req/min/user.

---

## Hardening

- `helmet()` on every response — includes CSP, HSTS, X-Frame-Options
- HTTPS enforced by PaaS; `Secure` cookie flag set when `NODE_ENV=production`
- Never log: secrets · tokens · session IDs · PII · full request bodies
- Never use `eval()`, `Function()`, or dynamic `require()`
- Keep deps current — Renovate or Dependabot; `npm audit` must be clean

---

## Testing (TDD: RED → GREEN → REFACTOR)

1. Write the failing test first
2. Write minimum code to pass
3. Refactor for clarity

**Coverage targets:** Auth + permissions = 100% · Business logic = 90%+ · Utils = 80%+

---

## Deployment

PaaS only (Railway, Render, Fly.io, Vercel). No self-managed infra.

- Database: local SQLite in persistent volume, or Turso for managed replication
- Secrets: set in PaaS dashboard env panel — never in code or `.env` committed
- Migrations: run `pnpm db:migrate` on deploy
- HTTPS: enforced at PaaS edge (automatic)

---

## References

- Better Auth — https://better-auth.com/docs
- Drizzle ORM — https://orm.drizzle.team/docs
- TypeBox — https://github.com/sinclairzx81/typebox
- Express — https://expressjs.com
- Helmet — https://helmetjs.github.io
- PRD — `PRD.md` in repo root
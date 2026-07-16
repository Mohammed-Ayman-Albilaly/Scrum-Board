# ScrumBoard

A Scrum-specialized project management app for agile teams (3–15 people). It runs the full
Scrum workflow: a shared **product backlog**, multiple **sprints** each with four fixed
sub-columns (Sprint Backlog → Under Development → Under Testing → Deployed), a global
read-only **Deployed** list, **structured ceremonies** (standup / planning / review / retro),
**multi-project** support with **per-project roles**, and server-enforced RBAC on every
mutation.

- **Backend:** Node.js + Express + TypeScript (strict), SQLite via libsql, Drizzle ORM,
  Better Auth (session cookies), TypeBox validation, helmet, express-rate-limit.
- **Frontend:** vanilla HTML/CSS/JS (no build step), `fetch` API, CSS variables.
- **Deployment:** Railway (NIXPACKS) — see [`railway.json`](railway.json).

---

## Quick start (local)

```bash
# from the repo root — pnpm only (npm/yarn/bun are rejected by policy)
pnpm install
cp .env.example backend/.env       # then set a real SESSION_SECRET (>= 32 chars)
pnpm --filter backend db:migrate   # apply Drizzle migrations
pnpm dev                           # http://localhost:3000
```

Run the checks the CI runs:

```bash
pnpm --filter backend typecheck    # tsc --noEmit (strict)
pnpm --filter backend test         # vitest run
```

---

## Deliverables

### 1. Rules file — [`CLAUDE.md`](CLAUDE.md), and it is actually applied

`CLAUDE.md` is the binding session guide. Its security rules are **enforced in code**, not
decorative. The mapping:

| Security rule (CLAUDE.md) | Where it is enforced |
|---|---|
| **Session auth, not JWT** — server holds state | Better Auth over Drizzle — [`backend/src/auth/betterAuth.ts`](backend/src/auth/betterAuth.ts) |
| **Cookies HttpOnly + SameSite=Strict + Secure in prod** | `betterAuth.ts` → `httpOnly:true, sameSite:"strict", useSecureCookies:isProd` |
| **Passwords hashed, never returned** | scrypt (Better Auth); `SafeUser` in [`lib/types.ts`](backend/src/lib/types.ts) never carries the hash |
| **RBAC server-side on every mutation** | `requireRole` + `requireProjectMember` — [`auth/middleware.ts`](backend/src/auth/middleware.ts), [`features/projects/middleware.ts`](backend/src/features/projects/middleware.ts) |
| **Per-project roles** (role scoped to a project) | `project_member_role` table + `hasProjectRole` / `assertScrumMaster` — [`features/projects/`](backend/src/features/projects) |
| **Project isolation** (no cross-project reads/writes) | `requireProjectMember` on every board router → `403` for non-members |
| **CSRF defense** on cookie-authed writes | `sameOriginOnly` — [`middleware/csrf.ts`](backend/src/middleware/csrf.ts), applied to auth + all mutations |
| **Env validated at startup, exit on failure** | TypeBox check + `process.exit(1)` — [`config/env.ts`](backend/src/config/env.ts) |
| **Input validation on every endpoint** | TypeBox `Value.Check` + `Value.Clean` (strips unknown keys) — [`lib/validate.ts`](backend/src/lib/validate.ts) |
| **Sanitize user HTML** before store/render | `sanitizeText` on story descriptions, sprint goals, ceremony text — [`lib/sanitize.ts`](backend/src/lib/sanitize.ts) |
| **Rate-limit mutations** | `express-rate-limit` (10/min/user) — [`middleware/rateLimit.ts`](backend/src/middleware/rateLimit.ts) |
| **Security headers** (CSP/HSTS/X-Frame) | `helmet` with a strict CSP — [`middleware/securityHeaders.ts`](backend/src/middleware/securityHeaders.ts) |
| **No `eval` / `Function` / dynamic `require`** | verified absent across the codebase |
| **No secrets in git** | only [`.env.example`](.env.example) is committed; `.env` / `*.db` git-ignored |

**Development process** — every feature goes through the five-stage *Commit-as-Contract*
pipeline (Frontend → Backend → Security review → Tests → CI), visible in the git history as
`feat:` / `security:` / `test:` commit chains.

### 2. Automated tests — 81 passing, covering core functionality

`pnpm --filter backend test` → **81 tests across 11 files, all green.** These assert real
behavior (RBAC 403s, generic 401s, project isolation, sanitization, locking), not placeholders.
See [Documented tests](#documented-tests) below.

**Coverage** (`vitest run --coverage`): **90.39% statements / 90.39% lines / 83.95% branches**
overall. Auth **98%**, projects **97.7%**, board **95.1%**, users **94.9%**, ceremonies **92.2%**,
`lib` **93.4%** (`sanitize`/`errors`/`response` 100%). The only 0% files are the process
entrypoints (`index.ts`, `migrate.ts`) which are bootstrap-only and exercised at deploy, not
in unit tests.

### 3. Security vulnerability — found and fixed

Documented in [`docs/security-review-landing-auth.md`](docs/security-review-landing-auth.md):

> **CSRF on cookie-authenticated endpoints — High — FIXED.**
> `POST /auth/signup | /login | /logout` are authenticated by a session cookie and change
> server state, but called Better Auth's server API directly, **bypassing its built-in origin
> check** — so a cross-origin page could drive them (`Origin: http://evil.example → HTTP 200`).
> **Fix:** a `sameOriginOnly` middleware ([`middleware/csrf.ts`](backend/src/middleware/csrf.ts))
> that rejects requests whose `Origin` host ≠ server host, applied to all three auth routes and
> every mutation. **After:** cross-origin → `403`, same-origin → `200`. Defense-in-depth on top
> of the `SameSite=Strict` cookie.

A second issue (rate-limit bypass behind a proxy) was also fixed via `app.set("trust proxy", 1)`
in production. Full history: the [`docs/`](docs) folder holds 8 security reviews, one per feature.

### 4. Project link

- **Source:** https://github.com/Mohammed-Ayman-Albilaly/Scrum-Board
- **Deployment:** Railway (see `railway.json`).
- **Link:** (https://scrum-board-2026.up.railway.app/).

---

## Documented tests

`backend/tests/` — 81 tests, 11 files. What each covers:

| File | Tests | Core functionality verified |
|---|---:|---|
| `auth.test.ts` | 12 | Signup/login/logout/session; **generic 401** (no user enumeration); **role/specialization smuggling stripped** from signup body; hardened session cookie set |
| `permissions.test.ts` | 6 | Each role tested separately against mutation endpoints (TM/PO/SM allowed vs `403`) |
| `roles.test.ts` | 9 | Per-project roles: founder becomes SM; SM-only invite/role-set; **SM of project A can't manage project B (403)**; union permissions (PO+SM); roles scoped per project; empty/unknown role → `400`, non-member target → `404` |
| `projects.test.ts` | 8 | Multi-project: create/list, signup auto-enroll, **cross-project read/write → 403**, no story leakage across boards, invite grants access, unknown-email `404`, non-member invite `403` |
| `board.test.ts` | 12 | `GET /board` aggregate; full sprint workflow (backlog → deployed); **closed-sprint locking (403)**; ceremonies RBAC + validation |
| `stories`* (in board) / `assignees.test.ts` | 8 | Assignee directory (no email/hash leak); PO assign/clear; **assignee must be a project member (404)**; TM/SM assign → `403`; closed-sprint assignment locked |
| `reorder.test.ts` | 5 | Backlog reorder up/down stays stable; top no-op; invalid direction `400`; sprint story `400`; TM `403` |
| `sprint_dates.test.ts` | 4 | Start/end stored + serialized; default null; **end-before-start `400`**; unparseable date `400` |
| `ceremonies.test.ts` | 7 | Structured per-type fields; **Retro 3-column board**; foreign-field drop; **HTML sanitization (stored XSS)**; out-of-range points `400`; TM `403` |
| `profile.test.ts` | 6 | `PATCH /users/me` sets/clears specialization; unknown value `400`; **mass-assignment guard** (can't touch other fields); auth + membership required |
| `contacts.test.ts` | 4 | `GET /users/contacts` lists co-members of shared projects, **excludes self**, dedupes across projects, and **never surfaces users from projects the caller isn't in** |

Run a single file: `pnpm --filter backend exec vitest run tests/roles.test.ts`.

---

## Architecture

Modular monolith — one Express app, feature-scoped folders under `backend/src/features/`
(`projects`, `users`, `board`, `stories`, `sprints`, `ceremonies`). Each feature has
`schema.ts · routes.ts · logic.ts · validation.ts`. Every board resource router runs
`requireAuth` → `requireProjectMember` and scopes to `?projectId=`. See [`CLAUDE.md`](CLAUDE.md)
for the full file tree, RBAC table, and design decisions, and [`PRD.md`](PRD.md) for requirements.

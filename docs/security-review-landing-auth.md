# Security Review — Landing Page & Auth API

**Stage 3 of the Commit-as-Contract workflow.**
Scope: the landing page (`frontend/public/index.html`, `scripts/auth.js`) and the
auth backend (`backend/src/auth/*`, `config/env.ts`, middleware, `index.ts`) as
committed in `feat: add landing page UI`, `feat: add auth API`, and
`feat: wire landing page to auth API`.

Reviewed for: RBAC gaps, CSRF, XSS, injection, secret handling, session security,
input validation, and rate limiting.

---

## Findings

### 1. CSRF on cookie-authenticated state-changing endpoints — **High** — FIXED

**Issue.** `POST /auth/signup`, `/login`, and `/logout` are authenticated by a
session cookie and change server state. The handlers call Better Auth's server
API (`auth.api.*`) directly, which bypasses Better Auth's built-in request/origin
CSRF checks. The server accepted cross-origin requests unconditionally.

**Evidence (pre-fix).**
```
POST /auth/login   Origin: http://evil.example   ->  HTTP 200
```

**Fix.** Added `sameOriginOnly` middleware
([backend/src/middleware/csrf.ts](../backend/src/middleware/csrf.ts)) applied to all
three mutation routes. It rejects any request whose `Origin` header host does not
match the server host, while allowing same-origin browser fetches and
non-browser/server-to-server clients (which send no `Origin`). This is
defense-in-depth on top of the existing `SameSite=Strict` session cookie.

**Verification (post-fix).**
```
POST /auth/login  Origin: http://evil.example    -> HTTP 403 (blocked)
POST /auth/login  Origin: http://localhost:3000  -> HTTP 200 (allowed)
POST /auth/login  (no Origin)                     -> HTTP 200 (allowed)
signup / logout   Origin: http://evil.example    -> HTTP 403 (blocked)
```

### 2. Rate-limit bypass / wrong client IP behind a proxy — **Medium** — FIXED

**Issue.** `express-rate-limit` keys by `req.ip`. On a PaaS that terminates TLS at
an edge proxy, without `trust proxy` every request appears to originate from the
proxy IP. All users share one rate-limit bucket, so a single attacker can exhaust
the limit for everyone (DoS), and `req.secure` is misreported.

**Fix.** `app.set("trust proxy", 1)` when `NODE_ENV=production`
([backend/src/index.ts](../backend/src/index.ts)). Scoped to production so local
dev is unaffected.

---

## Reviewed and acceptable

- **SQL injection.** All DB access is via Drizzle with parameterized queries; no
  string concatenation of user input. No finding.
- **XSS.** The landing page renders no user-supplied data. `auth.js` writes
  messages with `textContent`, never `innerHTML`. Helmet CSP restricts
  `script-src` to `'self'`. No finding.
- **Mass assignment.** Signup forwards only an explicit allowlist
  (`name/email/password/role/specialization`) to Better Auth, and `parseBody`
  strips unknown keys via `Value.Clean`. A client cannot set `emailVerified`,
  `id`, etc. No finding.
- **Secret handling.** `.env` is git-ignored (verified); only `.env.example` with
  placeholders is committed. `SESSION_SECRET` is validated (min 32 chars) at
  startup with `process.exit(1)` on failure. Logs never include bodies, tokens,
  or PII. No finding.
- **Sensitive data exposure.** API responses carry only `{id,name,email,role,
  specialization}`; password hashes (scrypt) and session tokens are never
  returned. No finding.
- **Session cookie.** `HttpOnly`, `SameSite=Strict`, and `Secure` in production.
  No finding.
- **Login user-enumeration.** Invalid login returns a generic
  "Invalid email or password" for both unknown email and wrong password. No finding.

## Accepted risk (low)

- **Signup email enumeration.** A duplicate email returns `409` with
  "An account with that email already exists." This confirms an email is
  registered. Accepted: it is standard signup UX, the login path is already
  non-enumerable, and signup is rate-limited (10/min). Revisit if the threat
  model requires email-verification-based signup.

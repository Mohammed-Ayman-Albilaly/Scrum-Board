# Security Review — Dashboard, Profile & Contacts

**Stage 3 of the Commit-as-Contract workflow.**
Scope: `feat: add dashboard and profile UI` (dashboard.html, profile.html,
scripts/{dashboard,profile,header}.js, board `?projectId=` seeding) and
`feat: add contacts and profile API` (`GET /users/contacts`,
`PATCH /users/me`, users routes restructure).

Reviewed for: data exposure, IDOR/enumeration, mass assignment, CSRF, RBAC
regressions, XSS.

---

## Findings

None requiring a patch.

## Reviewed and acceptable

- **Contacts scope.** `listContacts` self-joins `project_member` **anchored on
  the caller's own memberships** (`WHERE pm.user_id = me`), so it can only
  surface users who genuinely share a project with the caller — no way to
  enumerate strangers or other projects' rosters. Self is excluded via
  `ne(pm_other.user_id, me)`. Verified in `contacts.test.ts`.
- **`GET /users` guard survived the restructure.** `requireProjectMember`
  moved from router-level to the `GET /` route; a non-member still gets 403
  and an unauthenticated caller 401 (regression-tested). `/contacts` and
  `/me` intentionally sit outside the project guard: both operate strictly on
  `req.user.id`. The auto-appended `?projectId=` on `/users/contacts` (from
  the frontend's `withProject`) is ignored by the handler — no
  confused-deputy path.
- **Mass assignment on PATCH /users/me.** `UpdateProfileSchema` admits only
  `specialization` (literal union or null); `Value.Clean` strips everything
  else, and the UPDATE sets only that column + `updatedAt`. Name/email/roles
  cannot be touched through this endpoint (tested with smuggled keys).
- **CSRF / rate limiting.** `PATCH /users/me` carries `sameOriginOnly` +
  `mutationLimiter`; the two new GET reads are safe methods.
- **Board `?projectId=` seeding.** The URL parameter only *selects* a project
  client-side; every data request still passes `requireProjectMember`
  server-side, so a forged id in the URL produces 403s, not data.
- **XSS.** All new pages render exclusively through `el(...,{text})`
  (textContent); contact names/emails and project names are user-controlled
  and stay inert. Helmet CSP unchanged.

## Accepted risk (low)

- **Email visibility among teammates.** `/users/contacts` returns co-members'
  emails. Accepted by design: contacts are, by construction, people on the
  caller's own projects (the invite flow already requires knowing a user's
  email). The project directory (`GET /users`) still omits emails.

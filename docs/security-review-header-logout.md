# Security Review — Header Slim & Logout Relocation

**Stage 3 of the Commit-as-Contract workflow.**
Scope: `feat: move logout to profile and popover, slim header (UI)` —
header.js (`renderLogoutButton`, popover logout), board.js toolbar split,
profile.js logout button. Frontend-only change.

Reviewed for: CSRF, session handling, RBAC regressions, UI redress.

## Findings

None.

## Reviewed and acceptable

- **Logout semantics unchanged.** Both logout placements call the same
  `POST /auth/logout`, which keeps `sameOriginOnly` + `requireAuth`
  server-side; only the button's location moved. Session invalidation and the
  redirect to the landing page are identical to the previous header button.
- **No new data in the popover.** It renders only the caller's own
  name/email/current-project roles (all already available via `/auth/me` +
  `/projects`); nothing about other users.
- **Discoverability, not security.** Removing logout from the always-visible
  header is a UX decision; it does not extend session lifetime or bypass any
  guard. The popover is reachable via hover and keyboard (`:focus-within`).
- **Project switcher relocation.** The toolbar reuses the exact same
  project-bar element and SM-gated Invite/Members buttons — gating logic
  untouched (server remains authoritative regardless).

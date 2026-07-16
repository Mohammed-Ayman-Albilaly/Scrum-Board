# Security Review — Dialog System

**Stage 3 of the Commit-as-Contract workflow.**
Scope: the reusable dialog component as committed in
`feat: add reusable dialog component and replace native prompts (UI)`
(frontend: `scripts/dialog.js`, `scripts/{cards,board}.js` call sites,
`styles/{main,components}.css`). No backend changes in this feature.

Reviewed for: XSS, RBAC bypass, CSRF surface changes, clickjacking, input
handling.

---

## Findings

None requiring a patch.

## Reviewed and acceptable

- **XSS via dialog text.** Every string rendered by `dialog.js` (title, body,
  button labels, input placeholder/default) goes through `el(...,{text})` →
  `textContent`, never `innerHTML`. This includes user-controlled data
  interpolated at call sites (`story.title` prefilled in the rename dialog,
  `sp.name` in the close-sprint body). Helmet CSP additionally restricts
  `script-src`. No finding.
- **`customDialog` content injection.** The `content` parameter accepts a
  caller-built DOM node. All in-repo callers construct it with `el()`
  (textContent-safe). Constraint documented in the module header comment:
  content builders must not use `innerHTML` with untrusted data. No finding
  today; re-review any future caller.
- **RBAC.** Dialogs are advisory UX only — every confirmed action still calls
  the same API endpoints behind the same server-side guards
  (`requireAuth` → `requireProjectMember` → `requireRole` → limiter). Bypassing
  the dialog (devtools/curl) grants nothing the server doesn't already check.
  No finding.
- **CSRF.** No new endpoints, no changed request semantics; mutations keep
  `sameOriginOnly` + session-cookie auth. No finding.
- **Clickjacking / UI redress.** Native `<dialog>.showModal()` renders in the
  top layer of *this* document only; Helmet already sends
  `X-Frame-Options: DENY` (frame-ancestors), so the app can't be framed and
  overlaid. No finding.
- **Input handling.** `inputDialog` caps input at `maxlength=200` (client UX);
  server-side TypeBox schemas remain the real validators on every mutation.
  Cancel/Esc/backdrop paths resolve `false`/`null` and perform no request.
  No finding.

## Accepted risk (low)

- **Async gate refactor.** The two former synchronous `confirm() && …` gates
  (story delete, sprint close) are now async handlers; a double-click before
  the dialog opens cannot fire the mutation twice without a second explicit
  confirm, and the server treats repeat DELETE/close as idempotent-or-409.
  Accepted.

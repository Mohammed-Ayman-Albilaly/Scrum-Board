# Security Review — Board Enhancements

**Stage 3 of the Commit-as-Contract workflow.** Consolidated review of the
post-MVP board enhancements, one section per feature as it lands.

Reviewed for: RBAC, input validation, injection, XSS, and data integrity.

---

## Sprint dates (`feat: add sprint date UI`, `feat: validate sprint date range`)

Scope: `newSprintForm`/`sprintBlock` in `frontend/public/scripts/board.js` and
`createSprint` in `backend/src/features/sprints/logic.ts`.

### Finding — invalid date range accepted — **Low (data integrity)** — FIXED

**Issue.** `startDate`/`endDate` were parsed independently; a sprint could be
created with `endDate` before `startDate`, producing a nonsensical range on the
board.

**Fix.** `createSprint` now rejects `endDate < startDate` with `400 "Sprint end
date cannot be before its start date."` Covered by `tests/sprint_dates.test.ts`.

### Reviewed and acceptable

- **RBAC.** Sprint creation stays behind the `sm` guard chain
  `[sameOriginOnly, requireRole(SCRUM_MASTER), mutationLimiter]`; a non–Scrum
  Master gets `403`. Dates add no new endpoint. No finding.
- **Input validation.** Dates are optional strings (`maxLength: 40`) parsed with
  `new Date(...)`; an unparseable value throws `400 "…is not a valid date."`
  No finding.
- **Injection.** Parsed `Date` objects are bound through Drizzle as integer
  timestamps — never string-interpolated. No finding.
- **XSS.** The header renders the range via `el(...,{text})` (`textContent`),
  and `<input type="date">` constrains input to a date value. No finding.
- **Sensitive data.** `serializeSprint` exposes only `id/name/goal/startDate/
  endDate/status`. No finding.

---

## Backlog reorder (`feat: add backlog reorder UI` / `API`)

Scope: `backlogControls` in `frontend/public/scripts/cards.js` and
`reorderStory` + `PATCH /stories/:id/reorder` in
`backend/src/features/stories/{logic,routes,validation}.ts`.

No exploitable vulnerability found. Hardening in place:

- **RBAC.** The route uses the `po` guard chain
  `[sameOriginOnly, requireRole(PRODUCT_OWNER), mutationLimiter]`; a Team Member
  or Scrum Master gets `403`. Verified in `tests/reorder.test.ts`.
- **Scope guard.** `reorderStory` rejects a story that belongs to a sprint
  (`400 "Only backlog stories can be reordered."`), so the control can only
  touch the product backlog, and `findStory` scopes by `projectId`.
- **Atomicity.** The 0..n renumber runs inside `db.transaction`, so a failure
  mid-renumber cannot leave the backlog with duplicated/partial priorities.
- **Input validation.** `direction` is a `Type.Union` of the literals `"UP"`/
  `"DOWN"`; anything else is a `400`. Edge nudges (top/bottom) are a safe no-op.
- **Injection / XSS.** Drizzle-parameterized writes; the control renders as
  buttons, no user-supplied HTML. No finding.

---

## Structured ceremonies (`feat: structured ceremony UI` / `API`)

Scope: `frontend/public/scripts/ceremonies.js` and
`backend/src/features/ceremonies/{schema,validation,logic}.ts` (migration
`0002_nifty_dormammu.sql` adds `ceremony.details`).

### Finding — stored-XSS surface widened by new free-text fields — **Medium** — FIXED

**Issue.** The feature adds eight new user-controlled text fields (blockers,
goal, capacity, demoSummary, feedback, wentWell, needsImprovement, actionItems)
that are persisted and later rendered on the board. Any field that skipped
sanitization would be a stored-XSS vector.

**Fix.** `createCeremony` routes **every** text field through `buildDetails`,
which calls `sanitizeText` (strips all HTML) on each one before it is written;
`committedPoints` is an integer, not text. The client also renders details with
`el(...,{text})` (`textContent`). Covered by `tests/ceremonies.test.ts`
(`<script>` payload is stripped).

### Reviewed and acceptable

- **RBAC.** Create stays `sameOriginOnly + requireRole(SCRUM_MASTER) +
  mutationLimiter`; a Team Member/Product Owner gets `403`. Reads are all-roles.
  No finding.
- **JSON handling.** The `details` column only ever holds JSON produced by our
  own `buildDetails` (an allow-listed, sanitized object) — never a raw
  client-supplied JSON string — so `JSON.parse` on read cannot introduce
  attacker-controlled structure, and no object merge/`__proto__` sink exists.
  No finding.
- **Input validation.** `type` is enum-checked; text fields are length-bounded;
  `committedPoints` is a bounded integer; fields foreign to the submitted type
  are dropped by `buildDetails`; unknown keys are stripped by `parseBody`.
  No finding.
- **Sprint linkage.** A supplied `sprintId` is checked to exist in the project
  (`404` otherwise). No finding.

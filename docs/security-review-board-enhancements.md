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

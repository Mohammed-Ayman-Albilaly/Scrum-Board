// Shared app header: brand (→ dashboard), optional current-project name, and
// the avatar circle with its hover popover (identity + roles in the current
// project; click → full profile). Used by the board, dashboard, and profile
// pages so the top bar stays consistent everywhere.
import { el } from "./utils.js";
import { ROLE_LABELS } from "./permissions.js";

function initials(name) {
  const parts = String(name).trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() ?? "").join("") || "?";
}

function rolesLine(roles) {
  if (!Array.isArray(roles) || roles.length === 0) return "Member";
  return roles.map((r) => ROLE_LABELS[r] ?? r).join(" · ");
}

/**
 * Avatar circle + popover. `roles` are for the current project (omit on pages
 * without one). `popoverExtra` appends nodes (e.g. a logout button) below.
 */
export function renderAvatar({ me, roles, popoverExtra = [] }) {
  const popover = el("div", { class: "popover", role: "tooltip" }, [
    el("p", { class: "popover__name", text: me.name }),
    el("p", { class: "popover__email muted", text: me.email }),
    el("p", { class: "popover__roles", text: rolesLine(roles) }),
    ...popoverExtra,
  ]);
  const circle = el("button", {
    class: "avatar",
    title: "Open profile",
    "aria-label": `Profile: ${me.name}`,
    text: initials(me.name),
    onclick: () => { window.location.href = "/profile.html"; },
  });
  return el("div", { class: "avatar-wrap" }, [circle, popover]);
}

/**
 * Build the page header. `middle`/`trailing` are optional extra nodes
 * (the board keeps its project bar there until the header slims down).
 */
export function renderHeader({ me, roles, projectName, middle, trailing = [] }) {
  const left = [
    el("a", { class: "landing__brand app-header__home", href: "/dashboard.html" }, [
      el("span", { class: "brand-mark", "aria-hidden": "true" }),
      el("span", { class: "brand-name", text: "ScrumBoard" }),
    ]),
  ];
  if (projectName) left.push(el("span", { class: "app-header__project muted", text: projectName }));
  return el("header", { class: "app-header" }, [
    el("div", { class: "app-header__left" }, left),
    ...(middle ? [middle] : []),
    el("div", { class: "app-header__user" }, [...trailing, renderAvatar({ me, roles })]),
  ]);
}

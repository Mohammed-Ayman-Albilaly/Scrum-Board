// Shared app header: brand (→ dashboard), optional current-project name, and
// the avatar circle with its hover popover (identity + roles in the current
// project + the ONLY always-available logout; click → full profile). Used by
// the board, dashboard, and profile pages so the top bar stays consistent.
import { api, el } from "./utils.js";
import { ROLE_LABELS } from "./permissions.js";

/** Red logout button (POST /auth/logout → landing). Popover + profile page only. */
export function renderLogoutButton(extraClass = "") {
  return el("button", {
    class: `btn btn--danger btn--sm ${extraClass}`.trim(),
    text: "Log out",
    onclick: async () => {
      try { await api("/auth/logout", { method: "POST" }); } finally { window.location.href = "/"; }
    },
  });
}

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
 * without one). The popover always carries the logout button.
 */
export function renderAvatar({ me, roles }) {
  const popover = el("div", { class: "popover", role: "tooltip" }, [
    el("p", { class: "popover__name", text: me.name }),
    el("p", { class: "popover__email muted", text: me.email }),
    el("p", { class: "popover__roles", text: rolesLine(roles) }),
    renderLogoutButton("popover__logout"),
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

/** Build the page header: brand + optional current-project name + avatar only. */
export function renderHeader({ me, roles, projectName }) {
  const left = [
    el("a", { class: "landing__brand app-header__home", href: "/dashboard.html" }, [
      el("span", { class: "brand-mark", "aria-hidden": "true" }),
      el("span", { class: "brand-name", text: "ScrumBoard" }),
    ]),
  ];
  if (projectName) left.push(el("span", { class: "app-header__project muted", text: projectName }));
  return el("header", { class: "app-header" }, [
    el("div", { class: "app-header__left" }, left),
    el("div", { class: "app-header__user" }, [renderAvatar({ me, roles })]),
  ]);
}

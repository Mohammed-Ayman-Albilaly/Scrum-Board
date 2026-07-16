// Dashboard: the post-login landing page. Lists the user's projects (with
// their roles in each), offers Create Project, and shows profile + contacts
// panels. Opening a project navigates to the board with ?projectId=.
import { api, el, toast } from "./utils.js";
import { inputDialog } from "./dialog.js";
import { renderHeader } from "./header.js";
import { ROLE_LABELS, SPECIALIZATION_LABELS } from "./permissions.js";

const app = () => document.getElementById("app");

async function load() {
  let me;
  try {
    me = (await api("/auth/me")).user;
  } catch {
    window.location.href = "/";
    return;
  }
  const [{ projects }, contacts] = await Promise.all([
    api("/projects"),
    api("/users/contacts").then((d) => d.contacts).catch(() => null),
  ]);
  app().replaceChildren(
    renderHeader({ me }),
    el("main", { class: "dashboard" }, [
      projectsPanel(projects),
      el("div", { class: "dashboard__side" }, [profilePanel(me, projects), contactsPanel(contacts)]),
    ]),
  );
}

function roleBadges(roles) {
  if (!roles?.length) return [el("span", { class: "badge badge--unrefined", text: "Member" })];
  return roles.map((r) => el("span", { class: "badge badge--ready", text: ROLE_LABELS[r] ?? r }));
}

function projectCard(p) {
  return el("article", { class: "card project-card" }, [
    el("span", { class: "project-card__mark", "aria-hidden": "true", text: (p.name.trim()[0] ?? "?").toUpperCase() }),
    el("div", { class: "card__header" }, [el("span", { class: "card__title", text: p.name })]),
    el("div", { class: "project-card__roles" }, roleBadges(p.roles)),
    el("button", {
      class: "btn btn--primary btn--sm",
      text: "Open board",
      onclick: () => { window.location.href = `/board.html?projectId=${encodeURIComponent(p.id)}`; },
    }),
  ]);
}

function projectsPanel(projects) {
  const create = el("button", { class: "btn btn--primary", text: "+ Create Project", onclick: createProjectFlow });
  return el("section", { class: "panel dashboard__projects" }, [
    el("div", { class: "panel__head" }, [
      el("h2", { class: "panel__title" }, [
        el("span", { text: "Your projects" }),
        el("span", { class: "panel__count", text: String(projects.length) }),
      ]),
      create,
    ]),
    el("div", { class: "project-grid" },
      projects.length ? projects.map(projectCard) : [el("p", { class: "muted", text: "No projects yet — create one." })]),
  ]);
}

async function createProjectFlow() {
  const name = await inputDialog({ title: "New project", placeholder: "Project name", confirmText: "Create" });
  if (!name || !name.trim()) return;
  try {
    const { project } = await api("/projects", { method: "POST", body: { name: name.trim() } });
    toast(`Created "${project.name}"`, "success");
    window.location.href = `/board.html?projectId=${encodeURIComponent(project.id)}`;
  } catch (err) {
    toast(err.message, "error");
  }
}

function profilePanel(me, projects) {
  const rows = projects.map((p) =>
    el("li", { class: "profile-role-row" }, [
      el("span", { text: p.name }),
      el("span", { class: "muted", text: (p.roles ?? []).map((r) => ROLE_LABELS[r] ?? r).join(", ") || "Member" }),
    ]));
  return el("section", { class: "panel" }, [
    el("h2", { class: "panel__title", text: "Profile" }),
    el("p", { class: "profile-name", text: me.name }),
    el("p", { class: "muted", text: me.email }),
    el("h3", { class: "panel__subtitle", text: "Roles per project" }),
    el("ul", { class: "profile-roles" }, rows),
    el("a", { class: "btn btn--ghost btn--sm", href: "/profile.html", text: "Full profile" }),
  ]);
}

function contactsPanel(contacts) {
  const children = [el("h2", { class: "panel__title", text: "People you work with" })];
  if (contacts === null) {
    children.push(el("p", { class: "muted", text: "Contacts unavailable." }));
  } else if (!contacts.length) {
    children.push(el("p", { class: "muted", text: "No teammates yet — invite someone to a project." }));
  } else {
    children.push(el("ul", { class: "contact-list" }, contacts.map((c) =>
      el("li", { class: "contact-row" }, [
        el("span", { class: "contact-row__name", text: c.name }),
        el("span", { class: "muted", text: c.specialization ? (SPECIALIZATION_LABELS[c.specialization] ?? c.specialization) : "" }),
        el("span", { class: "muted contact-row__projects", text: (c.sharedProjects ?? []).map((p) => p.name).join(", ") }),
      ]))));
  }
  return el("section", { class: "panel" }, children);
}

document.addEventListener("DOMContentLoaded", load);

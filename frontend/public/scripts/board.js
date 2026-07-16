// Board orchestrator: loads the current user + board data and renders the
// three regions (backlog | sprints | deployed) plus the ceremonies panel.
import { api, el, toast, setProjectId } from "./utils.js";
import { dangerDialog, inputDialog } from "./dialog.js";
import { can, ROLE_LABELS } from "./permissions.js";
import { renderStoryCard } from "./cards.js";
import { renderCeremoniesPanel } from "./ceremonies.js";

let activeProjectId = null;

const SPRINT_COLS = [
  ["SPRINT_BACKLOG", "Sprint Backlog"],
  ["UNDER_DEVELOPMENT", "Under Development"],
  ["UNDER_TESTING", "Under Testing"],
  ["DEPLOYED", "Deployed"],
];

const app = () => document.getElementById("app");
const empty = (text) => el("p", { class: "muted", text });

async function load() {
  let me;
  try {
    me = (await api("/auth/me")).user;
  } catch {
    window.location.href = "/";
    return;
  }
  const { projects } = await api("/projects");
  if (!activeProjectId || !projects.some((p) => p.id === activeProjectId)) {
    activeProjectId = projects[0]?.id ?? null;
  }
  setProjectId(activeProjectId);

  const [board, ceremonies, members] = await Promise.all([
    api("/board"),
    api("/ceremonies"),
    api("/users"),
  ]);
  const ctx = {
    role: me.role,
    projects,
    activeProjectId,
    sprints: board.sprints,
    activeSprints: board.sprints.filter((s) => s.status === "ACTIVE"),
    sprintsById: new Map(board.sprints.map((s) => [s.id, s])),
    members: members.members,
    membersById: new Map(members.members.map((m) => [m.id, m])),
    ceremonies: ceremonies.ceremonies,
    reload: load,
  };
  app().replaceChildren(
    header(me, ctx),
    el("main", { class: "board" }, [
      backlogPanel(board.backlog, ctx),
      sprintsPanel(board.sprints, ctx),
      deployedPanel(board.deployed, ctx),
      renderCeremoniesPanel(ctx),
    ]),
  );
}

function header(me, ctx) {
  const logout = el("button", { class: "btn btn--ghost btn--sm", text: "Log out", onclick: async () => {
    try { await api("/auth/logout", { method: "POST" }); } finally { window.location.href = "/"; }
  } });
  return el("header", { class: "app-header" }, [
    el("div", { class: "landing__brand" }, [el("span", { class: "brand-mark", "aria-hidden": "true" }), el("span", { class: "brand-name", text: "ScrumBoard" })]),
    projectBar(ctx),
    el("div", { class: "app-header__user" }, [
      el("span", { class: "user-name", text: me.name }),
      el("span", { class: "badge badge--ready", text: ROLE_LABELS[me.role] ?? me.role }),
      logout,
    ]),
  ]);
}

function projectBar(ctx) {
  const select = el("select", { class: "card__control", title: "Active project",
    onchange: (e) => switchProject(e.target.value) },
    ctx.projects.map((p) => el("option", { value: p.id, text: p.name, selected: p.id === ctx.activeProjectId })));
  const create = el("button", { class: "btn btn--ghost btn--sm", text: "+ Project", onclick: createProjectFlow });
  const invite = el("button", { class: "btn btn--ghost btn--sm", text: "Invite", onclick: () => inviteFlow(ctx) });
  return el("div", { class: "project-bar" }, [el("span", { class: "muted", text: "Project" }), select, create, invite]);
}

function switchProject(id) {
  activeProjectId = id;
  setProjectId(id);
  load();
}

async function createProjectFlow() {
  const name = await inputDialog({ title: "New project", placeholder: "Project name", confirmText: "Create" });
  if (!name || !name.trim()) return;
  try {
    const { project } = await api("/projects", { method: "POST", body: { name: name.trim() } });
    activeProjectId = project.id;
    setProjectId(project.id);
    await load();
    toast(`Created "${project.name}"`, "success");
  } catch (err) {
    toast(err.message, "error");
  }
}

async function inviteFlow(ctx) {
  const email = await inputDialog({ title: "Invite teammate", body: "Invite a teammate to this project by email.", placeholder: "email@example.com", confirmText: "Invite" });
  if (!email || !email.trim()) return;
  try {
    await api(`/projects/${ctx.activeProjectId}/members`, { method: "POST", body: { email: email.trim() } });
    await load();
    toast("Member added", "success");
  } catch (err) {
    toast(err.message, "error");
  }
}

function backlogPanel(stories, ctx) {
  const children = [el("h2", { class: "panel__title", text: "Product Backlog" })];
  if (can.editBacklog(ctx.role)) children.push(newStoryForm(ctx));
  children.push(el("div", { class: "stack" }, stories.length
    ? stories.map((s, i) => renderStoryCard(s, ctx, { first: i === 0, last: i === stories.length - 1 }))
    : [empty("No stories yet.")]));
  return el("section", { class: "panel panel--backlog" }, children);
}

function newStoryForm(ctx) {
  const title = el("input", { class: "field-input", placeholder: "New story title", maxlength: "200" });
  const add = el("button", { class: "btn btn--primary btn--sm", text: "Add", onclick: () => submitStory(title, ctx) });
  return el("form", { class: "inline-form", onsubmit: (e) => { e.preventDefault(); submitStory(title, ctx); } }, [title, add]);
}

async function submitStory(input, ctx) {
  if (!input.value.trim()) return;
  try {
    await api("/stories", { method: "POST", body: { title: input.value.trim() } });
    input.value = "";
    await ctx.reload();
  } catch (err) {
    toast(err.message, "error");
  }
}

function sprintsPanel(sprints, ctx) {
  const children = [el("h2", { class: "panel__title", text: "Sprints" })];
  if (can.manageSprints(ctx.role)) children.push(newSprintForm(ctx));
  if (!sprints.length) children.push(empty("No sprints yet."));
  for (const sp of sprints) children.push(sprintBlock(sp, ctx));
  return el("section", { class: "panel panel--sprints" }, children);
}

function newSprintForm(ctx) {
  const name = el("input", { class: "field-input", placeholder: "Sprint name", maxlength: "120" });
  const goal = el("input", { class: "field-input", placeholder: "Goal (optional)", maxlength: "2000" });
  const start = el("input", { class: "field-input", type: "date", title: "Start date" });
  const end = el("input", { class: "field-input", type: "date", title: "End date" });
  const create = async () => {
    if (!name.value.trim()) return;
    try {
      await api("/sprints", { method: "POST", body: {
        name: name.value.trim(),
        goal: goal.value.trim() || undefined,
        startDate: start.value || undefined,
        endDate: end.value || undefined,
      } });
      name.value = ""; goal.value = ""; start.value = ""; end.value = "";
      await ctx.reload();
    } catch (err) {
      toast(err.message, "error");
    }
  };
  const add = el("button", { class: "btn btn--primary btn--sm", text: "Create sprint", onclick: create });
  return el("form", { class: "inline-form", onsubmit: (e) => { e.preventDefault(); create(); } }, [name, goal, start, end, add]);
}

function fmtDate(iso) {
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function sprintDateRange(sp) {
  if (sp.startDate && sp.endDate) return `${fmtDate(sp.startDate)} – ${fmtDate(sp.endDate)}`;
  if (sp.startDate) return `from ${fmtDate(sp.startDate)}`;
  if (sp.endDate) return `until ${fmtDate(sp.endDate)}`;
  return null;
}

function sprintBlock(sp, ctx) {
  const head = [
    el("span", { class: "sprint__name", text: sp.name }),
    el("span", { class: `badge badge--${sp.status === "CLOSED" ? "deployed" : "dev"}`, text: sp.status === "CLOSED" ? "Closed" : "Active" }),
  ];
  if (sp.goal) head.push(el("span", { class: "muted", text: sp.goal }));
  const range = sprintDateRange(sp);
  if (range) head.push(el("span", { class: "sprint__dates muted", text: range }));
  if (can.manageSprints(ctx.role) && sp.status === "ACTIVE") {
    head.push(el("button", { class: "btn btn--ghost btn--sm", text: "Close sprint", onclick: async () => {
      const ok = await dangerDialog({ title: "Close sprint", body: `Close ${sp.name}? Its columns lock and this cannot be undone.`, confirmText: "Close sprint" });
      if (ok) closeSprint(sp.id, ctx);
    } }));
  }
  const cols = el("div", { class: "sprint__cols" }, SPRINT_COLS.map(([key, label]) => {
    const items = sp.columns?.[key] ?? [];
    return el("div", { class: "sprint-col" }, [
      el("h3", { class: "sprint-col__title", text: label }),
      el("div", { class: "stack" }, items.length ? items.map((s) => renderStoryCard(s, ctx)) : [empty("—")]),
    ]);
  }));
  return el("div", { class: "sprint" }, [el("div", { class: "sprint__head" }, head), cols]);
}

async function closeSprint(id, ctx) {
  try {
    await api(`/sprints/${id}/close`, { method: "PATCH" });
    await ctx.reload();
  } catch (err) {
    toast(err.message, "error");
  }
}

function deployedPanel(stories, ctx) {
  const children = [el("h2", { class: "panel__title", text: "Deployed" })];
  if (!stories.length) {
    children.push(empty("Nothing deployed yet."));
    return el("section", { class: "panel panel--deployed" }, children);
  }
  const groups = new Map();
  for (const s of stories) {
    const key = s.sprintId ?? "none";
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(s);
  }
  for (const [sid, items] of groups) {
    children.push(el("h3", { class: "sprint-col__title", text: ctx.sprintsById.get(sid)?.name ?? "Unknown sprint" }));
    children.push(el("div", { class: "stack" }, items.map((s) => renderStoryCard(s, ctx, { readOnly: true }))));
  }
  return el("section", { class: "panel panel--deployed" }, children);
}

document.addEventListener("DOMContentLoaded", load);

// Board orchestrator: loads the current user + board data and renders the
// three regions (backlog | sprints | deployed) plus the ceremonies panel.
import { api, el, toast, setProjectId } from "./utils.js";
import { customDialog, dangerDialog, inputDialog } from "./dialog.js";
import { renderHeader } from "./header.js";
import { can, ROLES, ROLE_LABELS } from "./permissions.js";
import { renderStoryCard } from "./cards.js";
import { renderCeremoniesPanel } from "./ceremonies.js";

// Seeded from ?projectId= (how the dashboard opens a specific board), then
// kept in memory across re-renders; falls back to the first project.
let activeProjectId = new URLSearchParams(window.location.search).get("projectId");

// [key, label, slug] — slug drives the stage-colored rail (see layout.css).
const SPRINT_COLS = [
  ["SPRINT_BACKLOG", "Sprint Backlog", "backlog"],
  ["UNDER_DEVELOPMENT", "Under Development", "dev"],
  ["UNDER_TESTING", "Under Testing", "testing"],
  ["DEPLOYED", "Deployed", "deployed"],
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
    // The caller's roles in the ACTIVE project (multi-role; permission = union).
    roles: projects.find((p) => p.id === activeProjectId)?.roles ?? [],
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
    el("div", { class: "board-toolbar" }, [projectBar(ctx)]),
    el("main", { class: "board" }, [
      backlogPanel(board.backlog, ctx),
      sprintsPanel(board.sprints, ctx),
      deployedPanel(board.deployed, ctx),
      renderCeremoniesPanel(ctx),
    ]),
  );
}

function header(me, ctx) {
  const projectName = ctx.projects.find((p) => p.id === ctx.activeProjectId)?.name;
  return renderHeader({ me, roles: ctx.roles, projectName });
}

function projectBar(ctx) {
  const select = el("select", { class: "card__control", title: "Active project",
    onchange: (e) => switchProject(e.target.value) },
    ctx.projects.map((p) => el("option", { value: p.id, text: p.name, selected: p.id === ctx.activeProjectId })));
  const children = [el("span", { class: "muted", text: "Project" }), select,
    el("button", { class: "btn btn--ghost btn--sm", text: "+ Project", onclick: createProjectFlow })];
  if (can.manageMembers(ctx.roles)) {
    children.push(el("button", { class: "btn btn--ghost btn--sm", text: "Invite", onclick: () => inviteFlow(ctx) }));
    children.push(el("button", { class: "btn btn--ghost btn--sm", text: "Members", onclick: () => membersFlow(ctx) }));
  }
  return el("div", { class: "project-bar" }, children);
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

// Checkbox row for the three project roles; returns the node + a reader for
// the currently checked set.
function roleChecklist(selected = []) {
  const boxes = Object.values(ROLES).map((role) => {
    const box = el("input", { type: "checkbox", value: role });
    box.checked = selected.includes(role);
    return { role, box };
  });
  const node = el("div", { class: "role-checks" },
    boxes.map(({ role, box }) => el("label", { class: "role-checks__item" }, [box, el("span", { text: ROLE_LABELS[role] })])));
  return { node, getRoles: () => boxes.filter((b) => b.box.checked).map((b) => b.role) };
}

async function inviteFlow(ctx) {
  const email = el("input", { class: "field-input", type: "email", placeholder: "email@example.com" });
  const roles = roleChecklist([ROLES.TEAM_MEMBER]);
  const content = el("div", { class: "stack" }, [email, roles.node]);
  const ok = await customDialog({ title: "Invite teammate", body: "Invite an existing user to this project and pick their role(s).", content, confirmText: "Invite" });
  if (!ok || !email.value.trim()) return;
  if (!roles.getRoles().length) return toast("Pick at least one role.", "error");
  try {
    await api(`/projects/${ctx.activeProjectId}/members`, { method: "POST", body: { email: email.value.trim(), roles: roles.getRoles() } });
    await load();
    toast("Member added", "success");
  } catch (err) {
    toast(err.message, "error");
  }
}

// SM-only: review every member's roles and save the changed ones.
async function membersFlow(ctx) {
  const rows = ctx.members.map((m) => ({ member: m, checks: roleChecklist(m.roles ?? []) }));
  const content = el("div", { class: "stack" }, rows.map(({ member, checks }) =>
    el("div", { class: "member-row" }, [el("span", { class: "member-row__name", text: member.name }), checks.node])));
  const ok = await customDialog({ title: "Project members", body: "Adjust each member's role(s) in this project.", content, confirmText: "Save changes" });
  if (!ok) return;
  const changed = rows.filter(({ member, checks }) => {
    const next = checks.getRoles();
    const prev = member.roles ?? [];
    return next.length !== prev.length || next.some((r) => !prev.includes(r));
  });
  if (changed.some(({ checks }) => !checks.getRoles().length)) {
    return toast("Each member needs at least one role.", "error");
  }
  try {
    for (const { member, checks } of changed) {
      await api(`/projects/${ctx.activeProjectId}/members/${member.id}/roles`, { method: "PATCH", body: { roles: checks.getRoles() } });
    }
    if (changed.length) {
      await load();
      toast("Roles updated", "success");
    }
  } catch (err) {
    toast(err.message, "error");
  }
}

function panelTitle(text, count) {
  return el("h2", { class: "panel__title" }, [
    el("span", { text }),
    el("span", { class: "panel__count", text: String(count) }),
  ]);
}

function backlogPanel(stories, ctx) {
  const children = [panelTitle("Product Backlog", stories.length)];
  if (can.editBacklog(ctx.roles)) children.push(newStoryForm(ctx));
  children.push(el("div", { class: "stack" }, stories.length
    ? stories.map((s, i) => renderStoryCard(s, ctx, { first: i === 0, last: i === stories.length - 1 }))
    : [empty("No stories yet.")]));
  return el("section", { class: "panel panel--backlog" }, children);
}

function newStoryForm(ctx) {
  const title = el("input", { class: "field-input", placeholder: "New story title", maxlength: "200" });
  // type: "button" stops the click from ALSO firing the form's native submit
  // (the implicit default for an untyped <button> in a <form>) — without it,
  // one click fired both this onclick AND onsubmit below, double-posting.
  const add = el("button", { class: "btn btn--primary btn--sm", type: "button", text: "Add", onclick: () => submitStory(title, ctx) });
  // Enter-in-field still submits via this handler — the button never does.
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
  if (can.manageSprints(ctx.roles)) children.push(newSprintForm(ctx));
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
  // See newStoryForm above: type "button" is required or the click double-fires.
  const add = el("button", { class: "btn btn--primary btn--sm", type: "button", text: "Create sprint", onclick: create });
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
  if (can.manageSprints(ctx.roles)) {
    if (sp.status === "ACTIVE") {
      head.push(el("button", { class: "btn btn--ghost btn--sm", text: "Close sprint", onclick: async () => {
        const ok = await dangerDialog({ title: "Close sprint", body: `Close ${sp.name}? Its columns lock and this cannot be undone.`, confirmText: "Close sprint" });
        if (ok) closeSprint(sp.id, ctx);
      } }));
    }
    head.push(el("button", { class: "btn btn--ghost btn--sm", type: "button", text: "Delete sprint", onclick: async () => {
      const ok = await dangerDialog({ title: "Delete sprint", body: `Delete ${sp.name}? This cannot be undone. Move its stories back to the backlog first if it has any.`, confirmText: "Delete sprint" });
      if (ok) deleteSprintFlow(sp.id, ctx);
    } }));
  }
  const cols = el("div", { class: "sprint__cols" }, SPRINT_COLS.map(([key, label, slug]) => {
    const items = sp.columns?.[key] ?? [];
    return el("div", { class: `sprint-col sprint-col--${slug}` }, [
      el("h3", { class: "sprint-col__title" }, [
        el("span", { text: label }),
        el("span", { class: "sprint-col__count", text: String(items.length) }),
      ]),
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

async function deleteSprintFlow(id, ctx) {
  try {
    await api(`/sprints/${id}`, { method: "DELETE" });
    await ctx.reload();
    toast("Sprint deleted", "success");
  } catch (err) {
    toast(err.message, "error");
  }
}

function deployedPanel(stories, ctx) {
  const children = [panelTitle("Deployed", stories.length)];
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

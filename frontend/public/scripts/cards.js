// Story card rendering + inline actions. Controls shown depend on role and
// placement; the server is the real authority on every mutation.
import { api, el, toast } from "./utils.js";
import { can, SPECIALIZATION_LABELS } from "./permissions.js";

const COLUMN_ORDER = ["SPRINT_BACKLOG", "UNDER_DEVELOPMENT", "UNDER_TESTING", "DEPLOYED"];
const STATUS_BADGE = { UNREFINED: "unrefined", READY: "ready" };
const COLUMN_BADGE = {
  SPRINT_BACKLOG: "unrefined",
  UNDER_DEVELOPMENT: "dev",
  UNDER_TESTING: "testing",
  DEPLOYED: "deployed",
};
const LABEL = {
  UNREFINED: "Unrefined",
  READY: "Ready",
  SPRINT_BACKLOG: "Sprint Backlog",
  UNDER_DEVELOPMENT: "Under Dev",
  UNDER_TESTING: "Testing",
  DEPLOYED: "Deployed",
};
const POINT_OPTIONS = ["", "1", "2", "3", "5", "8", "13"];

function badge(story) {
  const key = story.column ?? story.status;
  return el("span", { class: `badge badge--${COLUMN_BADGE[story.column] ?? STATUS_BADGE[story.status]}`, text: LABEL[key] ?? key });
}

async function run(action, ctx) {
  try {
    await action();
    await ctx.reload();
  } catch (err) {
    toast(err.message, "error");
  }
}

function backlogControls(story, ctx, opts) {
  const status = el("select", { class: "card__control", title: "Status",
    onchange: (e) => run(() => api(`/stories/${story.id}`, { method: "PATCH", body: { status: e.target.value } }), ctx) },
    Object.keys(STATUS_BADGE).map((s) => el("option", { value: s, text: LABEL[s], selected: s === story.status })));
  const points = el("select", { class: "card__control", title: "Story points",
    onchange: (e) => run(() => api(`/stories/${story.id}`, { method: "PATCH", body: { storyPoints: e.target.value ? Number(e.target.value) : undefined } }), ctx) },
    POINT_OPTIONS.map((p) => el("option", { value: p, text: p === "" ? "— pts" : `${p} pts`, selected: String(story.storyPoints ?? "") === p })));
  const assign = el("select", { class: "card__control", title: "Add to sprint",
    onchange: (e) => run(() => api(`/stories/${story.id}/sprint`, { method: "PATCH", body: { sprintId: e.target.value || null } }), ctx) },
    [el("option", { value: "", text: "Backlog" }), ...ctx.activeSprints.map((s) => el("option", { value: s.id, text: s.name }))]);
  const edit = el("button", { class: "btn btn--ghost btn--sm", text: "✎", title: "Rename", onclick: () => renameStory(story, ctx) });
  const del = el("button", { class: "btn btn--ghost btn--sm", text: "🗑", title: "Delete",
    onclick: () => confirm("Delete this story?") && run(() => api(`/stories/${story.id}`, { method: "DELETE" }), ctx) });
  const reorder = (direction) => run(() => api(`/stories/${story.id}/reorder`, { method: "PATCH", body: { direction } }), ctx);
  const up = el("button", { class: "btn btn--ghost btn--sm", text: "▲", title: "Move up", disabled: opts.first, onclick: () => reorder("UP") });
  const down = el("button", { class: "btn btn--ghost btn--sm", text: "▼", title: "Move down", disabled: opts.last, onclick: () => reorder("DOWN") });
  return el("div", { class: "card__controls" }, [up, down, status, points, assign, edit, del]);
}

function renameStory(story, ctx) {
  const title = window.prompt("Story title", story.title);
  if (title && title.trim()) run(() => api(`/stories/${story.id}`, { method: "PATCH", body: { title: title.trim() } }), ctx);
}

function memberLabel(m) {
  const spec = m.specialization ? ` · ${SPECIALIZATION_LABELS[m.specialization] ?? m.specialization}` : "";
  return `${m.name}${spec}`;
}

// Read-only assignee line shown on every card (all roles) when one is set.
function assigneeTag(story, ctx) {
  if (!story.assigneeId) return null;
  const member = ctx.membersById?.get(story.assigneeId);
  const name = member?.name ?? "Unknown user";
  const children = [el("span", { class: "card__assignee-name", text: `\u{1F464} ${name}` })];
  if (member?.specialization) {
    children.push(el("span", { class: "badge badge--ready", text: SPECIALIZATION_LABELS[member.specialization] ?? member.specialization }));
  }
  return el("div", { class: "card__assignee" }, children);
}

// Product Owner control to (re)assign or clear a story's assignee.
function assigneeControls(story, ctx) {
  const select = el("select", { class: "card__control", title: "Assignee",
    onchange: (e) => run(() => api(`/stories/${story.id}/assign`, { method: "PATCH", body: { assigneeId: e.target.value || null } }), ctx) },
    [
      el("option", { value: "", text: "Unassigned", selected: !story.assigneeId }),
      ...ctx.members.map((m) => el("option", { value: m.id, text: memberLabel(m), selected: m.id === story.assigneeId })),
    ]);
  return el("div", { class: "card__controls" }, [select]);
}

function moveControls(story, ctx) {
  const idx = COLUMN_ORDER.indexOf(story.column);
  const move = (dir) => run(() => api(`/stories/${story.id}/move`, { method: "PATCH", body: { column: COLUMN_ORDER[idx + dir] } }), ctx);
  const back = el("button", { class: "btn btn--ghost btn--sm", text: "◀", title: "Move back", disabled: idx <= 0, onclick: () => move(-1) });
  const fwd = el("button", { class: "btn btn--ghost btn--sm", text: "▶", title: "Move forward", disabled: idx >= COLUMN_ORDER.length - 1, onclick: () => move(1) });
  return el("div", { class: "card__controls" }, [back, fwd]);
}

export function renderStoryCard(story, ctx, opts = {}) {
  const sprint = story.sprintId ? ctx.sprintsById.get(story.sprintId) : null;
  const locked = sprint?.status === "CLOSED";
  const header = el("div", { class: "card__header" }, [
    el("span", { class: "card__title", text: story.title }),
    badge(story),
  ]);
  const children = [header];
  if (story.storyPoints != null) header.append(el("span", { class: "card__points", text: `${story.storyPoints} pts` }));
  if (story.description) children.push(el("p", { class: "card__desc", text: story.description }));
  const tag = assigneeTag(story, ctx);
  if (tag) children.push(tag);
  if (!opts.readOnly && !story.sprintId && can.editBacklog(ctx.role)) children.push(backlogControls(story, ctx, opts));
  if (!opts.readOnly && !locked && can.assignStory(ctx.role)) children.push(assigneeControls(story, ctx));
  if (!opts.readOnly && story.sprintId && !locked && can.moveStory(ctx.role)) children.push(moveControls(story, ctx));
  return el("article", { class: "card" }, children);
}

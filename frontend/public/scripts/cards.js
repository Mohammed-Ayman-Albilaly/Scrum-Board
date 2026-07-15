// Story card rendering + inline actions. Controls shown depend on role and
// placement; the server is the real authority on every mutation.
import { api, el, toast } from "./utils.js";
import { can } from "./permissions.js";

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

function backlogControls(story, ctx) {
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
  return el("div", { class: "card__controls" }, [status, points, assign, edit, del]);
}

function renameStory(story, ctx) {
  const title = window.prompt("Story title", story.title);
  if (title && title.trim()) run(() => api(`/stories/${story.id}`, { method: "PATCH", body: { title: title.trim() } }), ctx);
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
  if (!opts.readOnly && !story.sprintId && can.editBacklog(ctx.role)) children.push(backlogControls(story, ctx));
  if (!opts.readOnly && story.sprintId && !locked && can.moveStory(ctx.role)) children.push(moveControls(story, ctx));
  return el("article", { class: "card" }, children);
}

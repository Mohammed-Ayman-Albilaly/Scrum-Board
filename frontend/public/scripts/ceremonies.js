// Ceremony logging panel. Scrum Master sees the form; everyone sees the log.
import { api, el, toast } from "./utils.js";
import { can } from "./permissions.js";

const TYPES = [
  ["STANDUP", "Daily Standup"],
  ["PLANNING", "Sprint Planning"],
  ["REVIEW", "Sprint Review"],
  ["RETRO", "Retrospective"],
];

function ceremonyForm(ctx) {
  const type = el("select", { class: "card__control" }, TYPES.map(([v, l]) => el("option", { value: v, text: l })));
  const sprintSel = el("select", { class: "card__control" }, [
    el("option", { value: "", text: "No sprint" }),
    ...ctx.sprints.map((s) => el("option", { value: s.id, text: s.name })),
  ]);
  const notes = el("textarea", { class: "field-input", rows: "2", maxlength: "10000", placeholder: "Notes, blockers, decisions…" });
  const submit = el("button", { class: "btn btn--primary btn--sm", text: "Log ceremony", onclick: async () => {
    try {
      await api("/ceremonies", { method: "POST", body: { type: type.value, sprintId: sprintSel.value || undefined, notes: notes.value.trim() || undefined } });
      notes.value = "";
      toast("Ceremony logged", "success");
      await ctx.reload();
    } catch (err) {
      toast(err.message, "error");
    }
  } });
  return el("form", { class: "ceremony-form", onsubmit: (e) => e.preventDefault() }, [type, sprintSel, notes, submit]);
}

function ceremonyItem(c) {
  const label = TYPES.find(([v]) => v === c.type)?.[1] ?? c.type;
  return el("div", { class: "ceremony-item" }, [
    el("div", { class: "ceremony-item__head" }, [
      el("span", { class: "badge badge--ready", text: label }),
      el("span", { class: "muted", text: new Date(c.createdAt).toLocaleString() }),
    ]),
    c.notes ? el("p", { class: "card__desc", text: c.notes }) : null,
  ]);
}

export function renderCeremoniesPanel(ctx) {
  const children = [el("h2", { class: "panel__title", text: "Ceremonies" })];
  if (can.logCeremonies(ctx.role)) children.push(ceremonyForm(ctx));
  const list = ctx.ceremonies.length
    ? ctx.ceremonies.map(ceremonyItem)
    : [el("p", { class: "muted", text: "No ceremonies logged yet." })];
  children.push(el("div", { class: "ceremony-list" }, list));
  return el("section", { class: "panel panel--ceremonies" }, children);
}

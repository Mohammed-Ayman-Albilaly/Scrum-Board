// Ceremony logging panel. Scrum Master sees the form; everyone sees the log.
// Each ceremony type has its own structured fields; Retro renders as a
// three-column board (Went Well / Needs Improvement / Action Items).
import { api, el, toast } from "./utils.js";
import { can } from "./permissions.js";

const TYPES = [
  ["STANDUP", "Daily Standup"],
  ["PLANNING", "Sprint Planning"],
  ["REVIEW", "Sprint Review"],
  ["RETRO", "Retrospective"],
];

// [key, label, kind] per type, in display order. kind drives the input widget.
const FIELD_DEFS = {
  STANDUP: [["blockers", "Blockers / impediments", "textarea"]],
  PLANNING: [
    ["goal", "Sprint goal", "input"],
    ["committedPoints", "Committed points", "number"],
    ["capacity", "Capacity notes", "textarea"],
  ],
  REVIEW: [
    ["demoSummary", "Demo summary", "textarea"],
    ["feedback", "Stakeholder feedback", "textarea"],
  ],
  RETRO: [
    ["wentWell", "Went Well", "textarea"],
    ["needsImprovement", "Needs Improvement", "textarea"],
    ["actionItems", "Action Items", "textarea"],
  ],
};

function fieldInput(kind) {
  if (kind === "textarea") return el("textarea", { class: "field-input", rows: "2", maxlength: "5000" });
  if (kind === "number") return el("input", { class: "field-input", type: "number", min: "0", max: "100000" });
  return el("input", { class: "field-input", maxlength: "2000" });
}

function ceremonyForm(ctx) {
  const type = el("select", { class: "card__control" }, TYPES.map(([v, l]) => el("option", { value: v, text: l })));
  const sprintSel = el("select", { class: "card__control" }, [
    el("option", { value: "", text: "No sprint" }),
    ...ctx.sprints.map((s) => el("option", { value: s.id, text: s.name })),
  ]);
  const fieldsWrap = el("div", { class: "ceremony-fields" });
  let inputs = {};
  const renderFields = () => {
    inputs = {};
    fieldsWrap.replaceChildren(...(FIELD_DEFS[type.value] ?? []).map(([key, label, kind]) => {
      const input = fieldInput(kind);
      inputs[key] = { input, kind };
      return el("label", { class: "ceremony-field" }, [el("span", { class: "ceremony-field__label", text: label }), input]);
    }));
  };
  type.addEventListener("change", renderFields);
  renderFields();

  const submit = el("button", { class: "btn btn--primary btn--sm", text: "Log ceremony", onclick: async () => {
    const body = { type: type.value };
    if (sprintSel.value) body.sprintId = sprintSel.value;
    for (const [key, { input, kind }] of Object.entries(inputs)) {
      const value = input.value.trim();
      if (!value) continue;
      body[key] = kind === "number" ? Number(value) : value;
    }
    try {
      await api("/ceremonies", { method: "POST", body });
      renderFields();
      toast("Ceremony logged", "success");
      await ctx.reload();
    } catch (err) {
      toast(err.message, "error");
    }
  } });
  return el("form", { class: "ceremony-form", onsubmit: (e) => e.preventDefault() }, [type, sprintSel, fieldsWrap, submit]);
}

function retroBoard(details) {
  const column = (key, label) => el("div", { class: "retro-col" }, [
    el("h4", { class: "retro-col__title", text: label }),
    el("p", { class: "card__desc", text: details[key] || "—" }),
  ]);
  return el("div", { class: "retro-board" }, [
    column("wentWell", "Went Well"),
    column("needsImprovement", "Needs Improvement"),
    column("actionItems", "Action Items"),
  ]);
}

function detailList(type, details) {
  const rows = (FIELD_DEFS[type] ?? [])
    .filter(([key]) => details[key] !== undefined && details[key] !== "")
    .map(([key, label]) => el("p", { class: "ceremony-detail" }, [
      el("span", { class: "ceremony-detail__label", text: `${label}: ` }),
      el("span", { text: String(details[key]) }),
    ]));
  return rows.length ? el("div", { class: "ceremony-detail-list" }, rows) : el("p", { class: "muted", text: "No details logged." });
}

function ceremonyItem(c) {
  const label = TYPES.find(([v]) => v === c.type)?.[1] ?? c.type;
  const details = c.details ?? {};
  return el("div", { class: "ceremony-item" }, [
    el("div", { class: "ceremony-item__head" }, [
      el("span", { class: "badge badge--ready", text: label }),
      el("span", { class: "muted", text: new Date(c.createdAt).toLocaleString() }),
    ]),
    c.type === "RETRO" ? retroBoard(details) : detailList(c.type, details),
  ]);
}

export function renderCeremoniesPanel(ctx) {
  const children = [el("h2", { class: "panel__title", text: "Ceremonies" })];
  if (can.logCeremonies(ctx.roles)) children.push(ceremonyForm(ctx));
  const list = ctx.ceremonies.length
    ? ctx.ceremonies.map(ceremonyItem)
    : [el("p", { class: "muted", text: "No ceremonies logged yet." })];
  children.push(el("div", { class: "ceremony-list" }, list));
  return el("section", { class: "panel panel--ceremonies" }, children);
}

// Full profile page: identity, roles per project, and the editable
// specialization (saved via PATCH /users/me).
import { api, el, toast } from "./utils.js";
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
  const { projects } = await api("/projects");
  app().replaceChildren(
    renderHeader({ me }),
    el("main", { class: "dashboard" }, [identityPanel(me), rolesPanel(projects)]),
  );
}

function identityPanel(me) {
  return el("section", { class: "panel" }, [
    el("h2", { class: "panel__title", text: "Profile" }),
    el("p", { class: "profile-name", text: me.name }),
    el("p", { class: "muted", text: me.email }),
    specializationForm(me),
  ]);
}

function specializationForm(me) {
  const options = [el("option", { value: "", text: "No specialization", selected: !me.specialization })];
  for (const [value, label] of Object.entries(SPECIALIZATION_LABELS)) {
    options.push(el("option", { value, text: label, selected: me.specialization === value }));
  }
  const select = el("select", { class: "field-input", title: "Specialization" }, options);
  const save = el("button", { class: "btn btn--primary btn--sm", text: "Save", onclick: async () => {
    try {
      await api("/users/me", { method: "PATCH", body: { specialization: select.value || null } });
      toast("Profile updated", "success");
    } catch (err) {
      toast(err.message, "error");
    }
  } });
  return el("div", { class: "profile-spec" }, [
    el("h3", { class: "panel__subtitle", text: "Specialization" }),
    el("div", { class: "inline-form" }, [select, save]),
  ]);
}

function rolesPanel(projects) {
  const rows = projects.map((p) =>
    el("li", { class: "profile-role-row" }, [
      el("span", { text: p.name }),
      el("span", { class: "muted", text: (p.roles ?? []).map((r) => ROLE_LABELS[r] ?? r).join(", ") || "Member" }),
    ]));
  return el("section", { class: "panel" }, [
    el("h2", { class: "panel__title", text: "Roles per project" }),
    el("ul", { class: "profile-roles" }, rows.length ? rows : [el("p", { class: "muted", text: "No projects yet." })]),
  ]);
}

document.addEventListener("DOMContentLoaded", load);

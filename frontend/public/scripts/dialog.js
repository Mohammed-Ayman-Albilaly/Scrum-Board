// Reusable modal dialogs — the app-wide replacement for alert/confirm/prompt.
// Built on <dialog>.showModal(): top-layer stacking, focus trap, and Esc-to-cancel
// come from the platform. All text is set via el()'s textContent (XSS-safe).
import { el } from "./utils.js";

// Core builder. Resolves true on confirm, false on cancel/Esc/backdrop click.
function openDialog({ title, body, content, input, confirmText = "Confirm", cancelText = "Cancel", danger = false }) {
  return new Promise((resolve) => {
    const cancel = el("button", { class: "btn btn--ghost", type: "button", text: cancelText });
    const confirmBtn = el("button", { class: `btn ${danger ? "btn--danger" : "btn--primary"}`, type: "submit", text: confirmText });
    const children = [el("h2", { class: "dialog__title", text: title })];
    if (body) children.push(el("p", { class: "dialog__body", text: body }));
    if (content) children.push(el("div", { class: "dialog__content" }, [content]));
    if (input) children.push(el("div", { class: "dialog__field" }, [input]));
    children.push(el("div", { class: "dialog__actions" }, [cancel, confirmBtn]));
    // method=dialog: Enter/confirm submits and closes natively; no page navigation.
    const form = el("form", { class: "dialog__form", method: "dialog" }, children);
    const dlg = el("dialog", { class: "dialog" }, [form]);
    let confirmed = false;
    form.addEventListener("submit", () => { confirmed = true; });
    cancel.addEventListener("click", () => dlg.close());
    // The form covers the dialog's inner area, so a click landing on the dialog
    // itself means the backdrop was clicked.
    dlg.addEventListener("click", (e) => { if (e.target === dlg) dlg.close(); });
    dlg.addEventListener("close", () => { dlg.remove(); resolve(confirmed); });
    document.body.append(dlg);
    dlg.showModal();
    if (input) { input.focus(); input.select?.(); }
  });
}

/** Confirmation dialog. Resolves true if confirmed. */
export function confirmDialog(opts) {
  return openDialog(opts);
}

/** Destructive-action dialog: red confirm button. Resolves true if confirmed. */
export function dangerDialog(opts) {
  return openDialog({ ...opts, danger: true });
}

/** Text-input dialog. Resolves the entered string, or null on cancel. */
export async function inputDialog({ title, body, defaultValue = "", placeholder, confirmText = "Save" }) {
  const input = el("input", { class: "field-input", value: defaultValue, placeholder, maxlength: "200" });
  const confirmed = await openDialog({ title, body, input, confirmText });
  return confirmed ? input.value : null;
}

/** Dialog wrapping a caller-built content node (forms, lists). Resolves true if confirmed. */
export function customDialog({ title, body, content, confirmText = "Save", danger = false }) {
  return openDialog({ title, body, content, confirmText, danger });
}

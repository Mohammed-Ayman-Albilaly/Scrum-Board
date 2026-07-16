// auth.js — landing page login/signup UI behavior.
// Posts credentials to the auth API and redirects to the dashboard on success.

"use strict";

const MIN_PASSWORD_LENGTH = 8;
const DASHBOARD_URL = "/dashboard.html";
const ENDPOINTS = { "panel-login": "/auth/login", "panel-signup": "/auth/signup" };

/** Switch the active auth tab and its associated form panel. */
function activateTab(target) {
  document.querySelectorAll(".auth-tab").forEach((tab) => {
    const isActive = tab.dataset.target === target;
    tab.classList.toggle("is-active", isActive);
    tab.setAttribute("aria-selected", String(isActive));
  });
  document.querySelectorAll(".auth-form").forEach((form) => {
    const isActive = form.id === `panel-${target}`;
    form.classList.toggle("is-active", isActive);
    form.hidden = !isActive;
  });
}

/** Set or clear the inline error message for a single field. */
function setFieldError(input, message) {
  const error = document.querySelector(`[data-error-for="${input.id}"]`);
  input.setAttribute("aria-invalid", message ? "true" : "false");
  if (error) error.textContent = message || "";
}

/** Validate one input; returns true when valid. */
function validateField(input) {
  const value = input.value.trim();
  if (input.required && !value) {
    setFieldError(input, "This field is required.");
    return false;
  }
  if (input.type === "email" && value && !isValidEmail(value)) {
    setFieldError(input, "Enter a valid email address.");
    return false;
  }
  if (input.name === "password" && value.length < MIN_PASSWORD_LENGTH) {
    setFieldError(input, `Use at least ${MIN_PASSWORD_LENGTH} characters.`);
    return false;
  }
  setFieldError(input, "");
  return true;
}

/** Lightweight email shape check (server does authoritative validation). */
function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

/** Validate every visible required field in a form. */
function validateForm(form) {
  const fields = form.querySelectorAll("input, select");
  let valid = true;
  fields.forEach((field) => {
    if (field.offsetParent === null) return; // skip hidden fields
    if (!validateField(field)) valid = false;
  });
  return valid;
}

/** Display a form-level note (e.g. a server error message). */
function showFormNote(form, message, variant) {
  const note = form.querySelector("[data-form-note]");
  if (!note) return;
  note.textContent = message;
  note.className = "form-note";
  if (variant) note.classList.add(`is-${variant}`);
}

/** Collect non-empty trimmed form values into a request payload. */
function buildPayload(form) {
  const payload = {};
  for (const [key, value] of new FormData(form).entries()) {
    const trimmed = typeof value === "string" ? value.trim() : value;
    if (trimmed !== "") payload[key] = trimmed;
  }
  return payload;
}

/** POST JSON to the API with the session cookie; return { status, body }. */
async function postJson(path, payload) {
  const res = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "same-origin",
    body: JSON.stringify(payload),
  });
  let body = null;
  try {
    body = await res.json();
  } catch {
    /* non-JSON or empty response */
  }
  return { status: res.status, body };
}

/** Toggle the submit button's loading state. */
function setSubmitting(button, isSubmitting) {
  if (!button) return;
  if (button.dataset.label === undefined) button.dataset.label = button.textContent;
  button.disabled = isSubmitting;
  button.textContent = isSubmitting ? "Please wait…" : button.dataset.label;
}

/** Handle a form submit: validate, POST to the API, redirect or show error. */
async function handleSubmit(event) {
  event.preventDefault();
  const form = event.currentTarget;
  if (!validateForm(form)) return;
  const button = form.querySelector('button[type="submit"]');
  setSubmitting(button, true);
  try {
    const { status, body } = await postJson(ENDPOINTS[form.id], buildPayload(form));
    if (status >= 200 && status < 300) {
      window.location.href = DASHBOARD_URL;
      return;
    }
    showFormNote(form, body?.error?.message ?? "Something went wrong. Please try again.", "error");
  } catch {
    showFormNote(form, "Network error — check your connection and try again.", "error");
  } finally {
    setSubmitting(button, false);
  }
}

/** Wire up tab clicks and form submissions. */
function init() {
  document.querySelectorAll(".auth-tab").forEach((tab) => {
    tab.addEventListener("click", () => activateTab(tab.dataset.target));
  });

  document.querySelectorAll(".auth-form").forEach((form) => {
    form.addEventListener("submit", handleSubmit);
    form.querySelectorAll("input, select").forEach((field) => {
      field.addEventListener("blur", () => validateField(field));
    });
  });
}

document.addEventListener("DOMContentLoaded", init);

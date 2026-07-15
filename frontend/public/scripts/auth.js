// auth.js — landing page login/signup UI behavior.
// Stage 1: client-side only. Backend wiring (fetch to /auth/*) lands in Stage 2.

"use strict";

const TEAM_MEMBER_ROLE = "TEAM_MEMBER";
const MIN_PASSWORD_LENGTH = 8;

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

/** Show or hide the specialization field based on the selected role. */
function toggleSpecialization(role) {
  const wrapper = document.querySelector("[data-specialization]");
  const select = document.getElementById("signup-specialization");
  if (!wrapper || !select) return;
  const isTeamMember = role === TEAM_MEMBER_ROLE;
  wrapper.hidden = !isTeamMember;
  select.required = isTeamMember;
  if (!isTeamMember) select.value = "";
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

/** Display a form-level note (placeholder until backend exists). */
function showFormNote(form, message, variant) {
  const note = form.querySelector("[data-form-note]");
  if (!note) return;
  note.textContent = message;
  note.className = "form-note";
  if (variant) note.classList.add(`is-${variant}`);
}

/** Handle a form submit: validate, then stub the backend call. */
function handleSubmit(event) {
  event.preventDefault();
  const form = event.currentTarget;
  if (!validateForm(form)) return;
  // Stage 2 will POST these credentials to the auth API.
  const action = form.id === "panel-signup" ? "Account creation" : "Login";
  showFormNote(form, `${action} will be enabled once the backend is connected.`, "success");
}

/** Wire up tab clicks, role changes, and form submissions. */
function init() {
  document.querySelectorAll(".auth-tab").forEach((tab) => {
    tab.addEventListener("click", () => activateTab(tab.dataset.target));
  });

  const roleSelect = document.getElementById("signup-role");
  if (roleSelect) {
    roleSelect.addEventListener("change", (e) => toggleSpecialization(e.target.value));
  }

  document.querySelectorAll(".auth-form").forEach((form) => {
    form.addEventListener("submit", handleSubmit);
    form.querySelectorAll("input, select").forEach((field) => {
      field.addEventListener("blur", () => validateField(field));
    });
  });
}

document.addEventListener("DOMContentLoaded", init);

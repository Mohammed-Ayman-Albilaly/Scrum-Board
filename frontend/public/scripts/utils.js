// Shared helpers: API wrapper (response envelope aware), DOM builder, toasts.

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

// The active project id, appended as ?projectId= to every scoped request so the
// server knows which board to read/write. Auth + project-management calls are
// left unscoped.
let currentProjectId = null;
export function setProjectId(id) {
  currentProjectId = id;
}

function withProject(path) {
  if (!currentProjectId || path.startsWith("/auth") || path.startsWith("/projects")) return path;
  const sep = path.includes("?") ? "&" : "?";
  return `${path}${sep}projectId=${encodeURIComponent(currentProjectId)}`;
}

/** Call the API. Returns `data` on success; throws ApiError otherwise. */
export async function api(path, { method = "GET", body } = {}) {
  const res = await fetch(withProject(path), {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    credentials: "same-origin",
    body: body ? JSON.stringify(body) : undefined,
  });
  let json = null;
  try {
    json = await res.json();
  } catch {
    /* empty / non-JSON body */
  }
  if (!res.ok) {
    throw new ApiError(json?.error?.message ?? `Request failed (${res.status})`, res.status);
  }
  return json?.data;
}

/** Create a DOM element. `text` sets textContent (XSS-safe); `on*` bind events. */
export function el(tag, props = {}, children = []) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(props)) {
    if (value === null || value === undefined || value === false) continue;
    if (key === "class") node.className = value;
    else if (key === "text") node.textContent = value;
    else if (key.startsWith("on") && typeof value === "function") {
      node.addEventListener(key.slice(2).toLowerCase(), value);
    } else node.setAttribute(key, value);
  }
  for (const child of [].concat(children)) if (child != null && child !== false) node.append(child);
  return node;
}

/** Transient toast message. `variant`: info | success | error. */
export function toast(message, variant = "info") {
  const host = document.getElementById("toasts");
  if (!host) return;
  const node = el("div", { class: `toast toast--${variant}`, text: message });
  host.append(node);
  setTimeout(() => node.remove(), 3500);
}

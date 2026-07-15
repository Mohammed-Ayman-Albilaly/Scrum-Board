// Strip all HTML from user-supplied text before storing it (story descriptions,
// ceremony notes). Defense against stored XSS even though the client renders
// with textContent. Empty string when nothing survives.
import sanitizeHtml from "sanitize-html";

export function sanitizeText(input: string): string {
  return sanitizeHtml(input, { allowedTags: [], allowedAttributes: {} }).trim();
}

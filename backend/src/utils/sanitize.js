/**
 * Strip HTML-like tags and collapse whitespace. Enforce max length.
 */
export function sanitizeString(value, maxLen = 5000) {
  if (value == null) return "";
  const s = String(value)
    .replace(/<[^>]*>/g, "")
    .replace(/[\u0000-\u001F\u007F]/g, "")
    .trim();
  return s.length > maxLen ? s.slice(0, maxLen) : s;
}

export function sanitizeEmail(value) {
  if (!value || typeof value !== "string") return undefined;
  const e = sanitizeString(value, 254).toLowerCase();
  const ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
  return ok ? e : undefined;
}

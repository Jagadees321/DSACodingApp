/** Prevent open redirects: only same-app paths starting with a single `/`. */
export function safeInternalPath(raw: string | undefined, fallback: string): string {
  if (!raw || typeof raw !== "string") return fallback;
  const t = raw.trim();
  if (!t.startsWith("/") || t.startsWith("//") || t.includes("\\")) return fallback;
  return t;
}

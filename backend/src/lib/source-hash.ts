import { createHash } from "node:crypto";

export function hashVisualizationKey(parts: { slug: string; language: string; sourceCode: string }): string {
  return createHash("sha256").update(`${parts.slug}\0${parts.language}\0${parts.sourceCode}`, "utf8").digest("hex");
}

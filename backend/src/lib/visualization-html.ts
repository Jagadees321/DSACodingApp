/** Strip optional ```html fences from model output. */
export function extractVisualizationHtml(raw: string): string {
  let t = raw.trim();
  const fence = /^```(?:html)?\s*\n?([\s\S]*?)\n?```\s*$/im.exec(t);
  if (fence) t = fence[1].trim();
  if (!t.includes("<")) {
    throw new Error("Model did not return HTML");
  }
  return t;
}

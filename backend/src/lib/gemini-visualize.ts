import { GoogleGenAI } from "@google/genai";
import { env } from "../config/env.js";
import { extractVisualizationHtml } from "./visualization-html.js";

type ProblemContext = {
  slug: string;
  title: string;
  description: string;
  constraints: string[];
  examples: { input: string; output: string; explanation?: string }[];
  referenceSolution: string;
};

function isRetryableModelUnavailable(err: unknown): boolean {
  const msg = (err instanceof Error ? err.message : String(err)).toLowerCase();
  return (
    msg.includes("status\":\"unavailable") ||
    msg.includes(" status: unavailable") ||
    msg.includes(" 503 ") ||
    msg.includes("high demand") ||
    msg.includes("try again later") ||
    msg.includes("resource_exhausted")
  );
}

function dedupeModels(primary: string, fallbacks: string[]): string[] {
  const models = [primary, ...fallbacks];
  const seen = new Set<string>();
  return models.filter((m) => {
    if (seen.has(m)) return false;
    seen.add(m);
    return true;
  });
}

export async function generateVisualizationHtml(params: {
  language: "java" | "python";
  userSourceCode: string;
  problem: ProblemContext;
}): Promise<string> {
  if (!env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is not configured");
  }

  const client = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });

  const userPrompt = `You are helping visualize an algorithm for a coding interview problem.

## Problem
**Slug:** ${params.problem.slug}
**Title:** ${params.problem.title}
**Language focus:** ${params.language}

### Description
${params.problem.description}

### Constraints
${params.problem.constraints.length ? params.problem.constraints.map((c) => `- ${c}`).join("\n") : "(none)"}

### Examples
${params.problem.examples
  .map(
    (ex, i) =>
      `Example ${i + 1}:\n- Input: ${ex.input}\n- Output: ${ex.output}${ex.explanation ? `\n- Note: ${ex.explanation}` : ""}`,
  )
  .join("\n\n")}

### Reference solution (${params.language})
\`\`\`${params.language === "java" ? "java" : "python"}
${params.problem.referenceSolution}
\`\`\`

### User's current solution (${params.language})
\`\`\`${params.language === "java" ? "java" : "python"}
${params.userSourceCode}
\`\`\`

## Task
Produce a **single self-contained HTML fragment** (no \`<!DOCTYPE>\`, no \`<html>\` wrapper required — you may output a \`<div>\` root) that teaches how this solution works using:
- Short headings and bullet points where useful
- A step-by-step or state illustration appropriate to the problem (arrays, pointers, recursion tree sketch, etc.)
- Optional minimal inline CSS in a \`<style>\` tag scoped under a root class (e.g. \`.viz-root\`)
- Optional vanilla JS in a single \`<script>\` only if it improves clarity; keep it safe and offline-friendly

### Variable naming and correctness rules (strict)
- Use variable names exactly as they appear in the chosen solution code.
- Add a "Variable Legend" section before the walkthrough that defines each important variable in one line.
- In each step, explicitly state what each updated variable means after the update.
- Never repurpose a variable label for a different meaning (example: if \`max_p\` is max profit, do not present it as price).
- If variable names are terse (like \`p\`, \`min_p\`, \`max_p\`), keep the original names but always show a human-readable meaning beside them.
- For table columns and cards, use labels like: \`p (current price)\`, \`min_p (lowest price so far)\`, \`max_p (best profit so far)\`.

### Depth requirements (strict)
- Explain the core idea in 2-4 concise bullets before the walkthrough.
- Include a full step-by-step walkthrough for at least one representative example.
- For each step, show: current input/state, variable updates, and why the update is correct.
- Add an "Edge Cases" section with at least 3 edge cases relevant to the algorithm.
- Add "Complexity" section with time and space complexity plus one-sentence justification.
- Keep explanations practical and interview-oriented; avoid vague generic text.

### Visual design requirements (strict)
- Use a clean modern card layout with clear section separation and consistent spacing.
- Use color coding with legend (e.g., current value, best-so-far, candidate/update).
- Include at least one visual progression element (timeline, stepper, or progress bar).
- Render variable state in a compact table and also as highlighted summary chips/cards.
- Make typography hierarchy obvious (title, section headers, body, monospace values).
- Ensure good contrast and readability in both light and dark backgrounds.
- Keep UI polished but lightweight: no external assets, no external CSS/JS, no network calls.

### Interactivity requirements (mandatory)
- The walkthrough MUST be interactive (not static text only).
- Include controls: **Previous**, **Next**, and **Reset** buttons.
- Include a visible step indicator like: \`Step X / N\`.
- Clicking Next/Previous must update the currently displayed state (array/pointers/variables) and explanation for that step.
- Disable Previous on first step and Next on last step.
- Reset must return to step 1.
- Implement this with inline vanilla JavaScript only; no frameworks and no external dependencies.
- Ensure buttons and dynamic regions are clearly visible and keyboard accessible.

**Critical:** Output **only** the HTML fragment — no markdown fences, no preamble or commentary outside HTML.

Use accessible colors and reasonable contrast. Keep total output under ~8000 characters when possible.`;

  const modelsToTry = dedupeModels(env.GEMINI_MODEL, env.GEMINI_FALLBACK_MODELS);
  let lastErr: unknown;

  for (let i = 0; i < modelsToTry.length; i += 1) {
    const model = modelsToTry[i];
    try {
      const result = await client.models.generateContent({
        model,
        contents: userPrompt,
      });

      const text = result.text;
      if (!text) {
        throw new Error(`Unexpected Gemini response shape for model ${model}`);
      }

      return extractVisualizationHtml(text);
    } catch (err) {
      lastErr = err;
      const canRetry = isRetryableModelUnavailable(err);
      const hasNextModel = i < modelsToTry.length - 1;
      if (!(canRetry && hasNextModel)) {
        break;
      }
    }
  }

  const message =
    (lastErr instanceof Error ? lastErr.message : String(lastErr)) ||
    "Gemini request failed";
  throw new Error(`${message} (models tried: ${modelsToTry.join(", ")})`);
}

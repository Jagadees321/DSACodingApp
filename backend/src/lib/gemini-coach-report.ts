import { GoogleGenAI } from "@google/genai";
import { env } from "../config/env.js";

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

function extractJsonObject(text: string): unknown {
  let t = text.trim();
  const fenced = /^```(?:json)?\s*\n?([\s\S]*?)```$/m.exec(t);
  if (fenced) t = fenced[1].trim();
  const start = t.indexOf("{");
  const end = t.lastIndexOf("}");
  if (start >= 0 && end > start) {
    t = t.slice(start, end + 1);
  }
  return JSON.parse(t);
}

const REPORT_PROMPT = `You are an expert DSA coach and performance analyst for RoyalsDSA platform.

Analyze the following user test data and generate a detailed performance report.

Return ONLY valid JSON. No markdown. No explanations.

STRICT STRUCTURE:
{
  "reportTitle": "",
  "executiveSummary": "",
  "scoreCard": {
    "overallScore": 0,
    "accuracyScore": 0,
    "speedScore": 0,
    "efficiencyScore": 0,
    "consistencyScore": 0,
    "scoreExplanation": ""
  },
  "problemBreakdown": [
    {
      "problemTitle": "",
      "verdict": "Excellent | Good | Struggled | Failed",
      "insight": "",
      "tip": ""
    }
  ],
  "strengthAreas": [
    {
      "topic": "",
      "evidence": ""
    }
  ],
  "weakAreas": [
    {
      "topic": "",
      "evidence": "",
      "howToFix": ""
    }
  ],
  "errorPatysis": {
    "mostCommonError": "WRONG_ANSWER | TIME_LIMIT_EXCEEDED | RUNTIME_ERROR | COMPILE_ERROR",
    "errorPattern": "",
    "rootCause": "",
    "fix": ""
  },
  "performanceVsLevel": "",
  "nextLevelReadiness": {
    "readyForNextLevel": false,
    "currentLevel": "",
    "nextLevel": "",
    "missingSkills": [],
    "estimatedDaysToReady": 0
  },
  "motivationalMessage": "",
  "wrongAttemptCorrections": [
    {
      "problemTitle": "",
      "language": "python | java",
      "failedRunNo": 0,
      "whatWentWrong": "",
      "wrongCodeSnippet": "",
      "nextRunNo": 0,
      "howTheyFixedIt": "",
      "correctedCodeSnippet": "",
      "outcomeAfterFix": "accepted | still_failing | no_followup_run"
    }
  ]
}

IMPORTANT RULES:
- DO NOT include studyPlan or any suggestions section.
- Output ONLY the keys shown above (including wrongAttemptCorrections). No other top-level fields.
- wrongAttemptCorrections MUST include one object per row in USER DATA \"attemptFailuresAndFollowUps\" (same order). If that array is empty, use [].
- For each wrong attempt: describe the concrete mistake using judge output (failureOnStoppingCase, stderr, wrong vs expected) and run numbers from USER DATA.
- wrongCodeSnippet: quote the smallest excerpt from that row's wrongCodeExcerpt that proves the bug (never invent code).
- When followingRunNo is null: set outcomeAfterFix to \"no_followup_run\", nextRunNo to 0, correctedCodeSnippet to \"\", howTheyFixedIt to \"No subsequent run on this problem.\"
- When a following run exists: correctedCodeSnippet must quote from followingCodeExcerpt (minimal lines showing the fix). Explain howTheyFixedIt using programmaticDiffSummary plus the two excerpts.
- outcomeAfterFix: \"accepted\" if followingJudgeStatus is accepted; \"still_failing\" if there was a next run but not accepted; \"no_followup_run\" if no next run.
- Be specific using actual numbers from the data.
- Keep insights short and precise.

USER DATA:
`;

export async function generateCoachPerformanceReport(userData: unknown): Promise<unknown> {
  if (!env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is not configured");
  }

  const client = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });
  const userPayload = JSON.stringify(userData);
  const contents = `${REPORT_PROMPT}${userPayload}`;

  const modelsToTry = dedupeModels(env.GEMINI_MODEL, env.GEMINI_FALLBACK_MODELS);
  let lastErr: unknown;

  for (let i = 0; i < modelsToTry.length; i += 1) {
    const model = modelsToTry[i];
    try {
      const result = await client.models.generateContent({
        model,
        contents,
      });
      const text = result.text;
      if (!text) {
        throw new Error(`Unexpected Gemini response shape for model ${model}`);
      }
      return extractJsonObject(text);
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
    (lastErr instanceof Error ? lastErr.message : String(lastErr)) || "Gemini request failed";
  throw new Error(`${message} (models tried: ${modelsToTry.join(", ")})`);
}

import { z } from "zod";

/** Normalize `{ output }` → `{ expectedOutput }` (common typo in hand-written JSON). */
export function normalizeTestPair(val: unknown): unknown {
  if (val && typeof val === "object" && !Array.isArray(val)) {
    const v = val as Record<string, unknown>;
    if ("output" in v && !("expectedOutput" in v)) {
      return { ...v, expectedOutput: v.output };
    }
  }
  return val;
}

/** Accept plain string OR structured JSON (e.g. {anyOf:[...]}), store as string consistently. */
function normalizeExpectedOutput(value: unknown): string {
  if (typeof value === "string") return value;
  return JSON.stringify(value);
}

/** stdin / expected output may be empty strings (e.g. empty string problem, empty multi-line output). */
export const stdinExpectedPairSchema = z.preprocess(
  normalizeTestPair,
  z.object({
    stdin: z.string(),
    expectedOutput: z.unknown().transform(normalizeExpectedOutput),
  }),
);

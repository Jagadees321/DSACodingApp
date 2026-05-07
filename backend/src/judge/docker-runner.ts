import { env } from "../config/env.js";

type RunResult = {
  status: "accepted" | "failed" | "runtime_error" | "compile_error";
  stdout: string;
  stderr: string;
  executionTimeMs: number;
  memoryKb: number;
};

function normalizeJavaUserSource(sourceCode: string): string {
  return sourceCode.replace(/\bpublic\s+class\s+Solution\b/g, "class Solution");
}

function buildJavaWrapperSource(sourceCode: string): string {
  const hasMainClass = /\bclass\s+Main\b/.test(sourceCode);
  const hasMainMethod = /public\s+static\s+void\s+main\s*\(\s*String\[\]\s+\w+\s*\)/.test(sourceCode);
  if (hasMainClass && hasMainMethod) return sourceCode;

  const userSource = normalizeJavaUserSource(sourceCode);
  return `${userSource}

public class Main {
  private static String stripQuotes(String s) {
    String t = s.trim();
    if (t.length() >= 2 && t.startsWith("\\"") && t.endsWith("\\"")) return t.substring(1, t.length() - 1);
    return t;
  }

  private static int[] parseIntArray(String raw) {
    String s = raw.trim();
    if (s.equals("[]")) return new int[0];
    if (s.startsWith("[") && s.endsWith("]")) s = s.substring(1, s.length() - 1);
    if (s.trim().isEmpty()) return new int[0];
    String[] parts = s.split(",");
    int[] arr = new int[parts.length];
    for (int i = 0; i < parts.length; i++) arr[i] = Integer.parseInt(parts[i].trim());
    return arr;
  }

  private static Object parseArg(String raw, Class<?> type) {
    if (type == int.class || type == Integer.class) return Integer.parseInt(raw.trim());
    if (type == long.class || type == Long.class) return Long.parseLong(raw.trim());
    if (type == boolean.class || type == Boolean.class) return Boolean.parseBoolean(raw.trim());
    if (type == String.class) return stripQuotes(raw);
    if (type == int[].class) return parseIntArray(raw);
    return stripQuotes(raw);
  }

  private static String formatResult(Object value) {
    if (value == null) return "null";
    if (value instanceof Boolean) return ((Boolean) value) ? "true" : "false";
    if (value instanceof int[]) {
      int[] arr = (int[]) value;
      StringBuilder sb = new StringBuilder("[");
      for (int i = 0; i < arr.length; i++) {
        if (i > 0) sb.append(",");
        sb.append(arr[i]);
      }
      sb.append("]");
      return sb.toString();
    }
    return String.valueOf(value);
  }

  public static void main(String[] args) throws Exception {
    java.io.BufferedReader br = new java.io.BufferedReader(new java.io.InputStreamReader(System.in));
    java.util.List<String> lines = new java.util.ArrayList<>();
    String line;
    while ((line = br.readLine()) != null) lines.add(line);

    Class<?> cls = Solution.class;
    java.lang.reflect.Method target = null;
    for (java.lang.reflect.Method m : cls.getDeclaredMethods()) {
      if (!java.lang.reflect.Modifier.isPublic(m.getModifiers())) continue;
      if (m.getName().equals("main")) continue;
      target = m;
      break;
    }
    if (target == null) throw new RuntimeException("No public solution method found");

    Object instance = cls.getDeclaredConstructor().newInstance();
    Class<?>[] paramTypes = target.getParameterTypes();
    Object[] callArgs = new Object[paramTypes.length];
    for (int i = 0; i < paramTypes.length; i++) {
      String raw = i < lines.size() ? lines.get(i) : "";
      callArgs[i] = parseArg(raw, paramTypes[i]);
    }
    Object result = target.invoke(instance, callArgs);
    System.out.println(formatResult(result));
  }
}
`;
}

function buildPythonWrapperSource(sourceCode: string): string {
  if (/if\s+__name__\s*==\s*['"]__main__['"]\s*:/.test(sourceCode)) return sourceCode;
  return `${sourceCode}

import json

def __parse_line(v):
    t = v.strip()
    if t == "":
        return ""
    try:
        return json.loads(t)
    except Exception:
        if len(t) >= 2 and t[0] == '"' and t[-1] == '"':
            return t[1:-1]
        return t

def __format_out(v):
    if isinstance(v, bool):
        return "true" if v else "false"
    if isinstance(v, list):
        return json.dumps(v, separators=(",", ":"))
    return str(v)

def __pick_callable():
    # Preferred style: class Solution with one public method.
    sol = globals().get("Solution")
    if isinstance(sol, type):
        solver = sol()
        methods = [
            name
            for name in dir(solver)
            if callable(getattr(solver, name)) and not name.startswith("__")
        ]
        if methods:
            return getattr(solver, methods[0])

    # Common style: top-level solve()/twoSum()/etc function.
    preferred = globals().get("solve")
    if callable(preferred):
        return preferred

    # Last fallback: first user-defined callable in this module.
    blocked = {"__parse_line", "__format_out", "__pick_callable"}
    for name, value in globals().items():
        if name in blocked:
            continue
        if callable(value) and getattr(value, "__module__", None) == "__main__":
            return value
    return None

if __name__ == "__main__":
    lines = []
    try:
        import sys
        lines = sys.stdin.read().splitlines()
    except Exception:
        lines = []

    fn = __pick_callable()
    if fn is None:
        raise Exception("No solution callable found")
    args = [__parse_line(line) for line in lines]
    result = fn(*args)
    print(__format_out(result))
`;
}

const languageMap: Record<"java" | "python", number> = {
  java: 62,
  python: 71,
};

function b64Encode(value: string) {
  return Buffer.from(value, "utf8").toString("base64");
}

function b64Decode(value?: string | null) {
  if (!value) return "";
  return Buffer.from(value, "base64").toString("utf8");
}

function judge0Headers() {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (env.JUDGE0_API_KEY) headers["X-RapidAPI-Key"] = env.JUDGE0_API_KEY;
  if (env.JUDGE0_API_HOST) headers["X-RapidAPI-Host"] = env.JUDGE0_API_HOST;
  if (env.JUDGE0_AUTH_TOKEN) headers["X-Auth-Token"] = env.JUDGE0_AUTH_TOKEN;
  return headers;
}

async function readResponseSnippet(res: Response): Promise<string> {
  try {
    const t = await res.text();
    const s = t.replace(/\s+/g, " ").trim();
    return s.length > 240 ? `${s.slice(0, 240)}…` : s;
  } catch {
    return "";
  }
}

function tryParseJson(value: string): unknown | null {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function toTupleLines(value: string): string[] | null {
  const raw = value.trim();
  if (!raw) return [];

  const parsed = tryParseJson(raw);
  if (
    Array.isArray(parsed) &&
    parsed.every(
      (row) =>
        Array.isArray(row) &&
        row.every((cell) => typeof cell === "number" || typeof cell === "string" || typeof cell === "boolean"),
    )
  ) {
    return parsed
      .map((row) => (row as Array<string | number | boolean>).map((v) => String(v)).join(" "))
      .sort();
  }

  const lines = raw.split("\n").map((line) => line.trim()).filter(Boolean);
  if (!lines.length) return [];
  const tokenized = lines.map((line) => line.split(/[\s,]+/).filter(Boolean));
  if (!tokenized.every((row) => row.length > 0)) return null;
  return tokenized.map((row) => row.join(" ")).sort();
}

function normalizeScalar(value: string): string {
  const raw = value.trim();
  const parsed = tryParseJson(raw);
  if (parsed !== null) return JSON.stringify(parsed);
  return raw.replace(/\r\n/g, "\n");
}

function outputsMatch(actual: string, expected: string): boolean {
  // Optional flexible matcher for problems with multiple valid outputs:
  // expectedOutput can be: {"anyOf":[candidate1, candidate2, ...]}
  const expectedParsed = tryParseJson(expected.trim());
  if (
    expectedParsed &&
    typeof expectedParsed === "object" &&
    !Array.isArray(expectedParsed) &&
    Array.isArray((expectedParsed as { anyOf?: unknown[] }).anyOf)
  ) {
    const candidates = (expectedParsed as { anyOf: unknown[] }).anyOf;
    return candidates.some((candidate) => {
      const candidateText =
        typeof candidate === "string" ? candidate : JSON.stringify(candidate);
      return outputsMatch(actual, candidateText);
    });
  }

  const tupleActual = toTupleLines(actual);
  const tupleExpected = toTupleLines(expected);
  if (tupleActual && tupleExpected) {
    if (tupleActual.length !== tupleExpected.length) return false;
    return tupleActual.every((line, idx) => line === tupleExpected[idx]);
  }
  return normalizeScalar(actual) === normalizeScalar(expected);
}

export async function runInDockerSandbox(input: {
  language: "java" | "python";
  sourceCode: string;
  stdin: string;
  expectedOutput: string;
}): Promise<RunResult> {
  const started = Date.now();
  try {
    const createResponse = await fetch(
      `${env.JUDGE0_BASE_URL}/submissions?base64_encoded=true&wait=false`,
      {
        method: "POST",
        headers: judge0Headers(),
        body: JSON.stringify({
          source_code: b64Encode(
            input.language === "java"
              ? buildJavaWrapperSource(input.sourceCode)
              : buildPythonWrapperSource(input.sourceCode),
          ),
          language_id: languageMap[input.language],
          stdin: b64Encode(input.stdin),
          cpu_time_limit: 2,
          wall_time_limit: 5,
          memory_limit: 262144,
        }),
      },
    );

    if (!createResponse.ok) {
      const detail = await readResponseSnippet(createResponse);
      throw new Error(
        `Judge0 create failed: HTTP ${createResponse.status}${detail ? ` — ${detail}` : ""}`,
      );
    }
    const created = (await createResponse.json()) as { token?: string };
    if (!created.token) throw new Error("Judge0 token missing");

    let statusId = 1;
    let stdout = "";
    let stderr = "";
    let compileOutput = "";
    let memoryKb = 0;
    let timeSec = 0;

    for (let i = 0; i < env.JUDGE0_MAX_POLLS; i += 1) {
      await new Promise((resolve) => setTimeout(resolve, env.JUDGE0_POLL_INTERVAL_MS));
      const statusResponse = await fetch(
        `${env.JUDGE0_BASE_URL}/submissions/${created.token}?base64_encoded=true&fields=status_id,stdout,stderr,compile_output,memory,time`,
        {
          headers: judge0Headers(),
        },
      );
      if (!statusResponse.ok) continue;

      const data = (await statusResponse.json()) as {
        status_id?: number;
        stdout?: string;
        stderr?: string;
        compile_output?: string;
        memory?: number;
        time?: string;
      };
      statusId = data.status_id ?? 1;
      stdout = b64Decode(data.stdout);
      stderr = b64Decode(data.stderr);
      compileOutput = b64Decode(data.compile_output);
      memoryKb = data.memory ?? 0;
      timeSec = Number(data.time ?? "0");

      if (statusId !== 1 && statusId !== 2) break;
    }

    const normalized = stdout.trim();
    const expected = input.expectedOutput.trim();
    const statusFromJudge: RunResult["status"] =
      statusId === 6
        ? "compile_error"
        : statusId >= 7
          ? "runtime_error"
          : outputsMatch(normalized, expected)
            ? "accepted"
            : "failed";

    return {
      status: statusFromJudge,
      stdout: normalized,
      stderr: (stderr || compileOutput).trim(),
      executionTimeMs: Math.max(Date.now() - started, Math.round(timeSec * 1000)),
      memoryKb,
    };
  } catch (error) {
    return {
      status: "runtime_error",
      stdout: "",
      stderr: String((error as Error).message),
      executionTimeMs: Date.now() - started,
      memoryKb: 0,
    };
  }
}


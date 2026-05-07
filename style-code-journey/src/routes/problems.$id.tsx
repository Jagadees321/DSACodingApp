import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { NavBar } from "@/components/NavBar";
import { getProblem, problems } from "@/data/problems";
import { LevelBadge } from "@/components/LevelBadge";
import { CodeEditor } from "@/components/CodeEditor";
import { useState, useMemo, useEffect } from "react";
import {
  ArrowLeft,
  Play,
  RotateCcw,
  CheckCircle2,
  XCircle,
  ChevronRight,
  Lightbulb,
  Sparkles,
  Loader2,
  Moon,
  Sun,
} from "lucide-react";
import { apiGet, apiPost, getApiToken, useApi } from "@/lib/api";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { requireAuthBeforeLoad } from "@/lib/auth-guard";

export const Route = createFileRoute("/problems/$id")({
  beforeLoad: () => requireAuthBeforeLoad(),
  loader: async ({ params }) => {
    if (!useApi) {
      const p = getProblem(params.id);
      if (!p) throw notFound();
      return {
        problem: {
          id: p.id,
          title: p.title,
          level: p.level,
          topic: p.topic,
          description: p.description,
          examples: p.examples,
          constraints: p.constraints,
          starter: p.starter,
          tests: p.tests,
        },
      };
    }
    const data = await apiGet<any>(`/problems/${params.id}`);
    if (!data) throw notFound();
    return {
      problem: {
        id: data.slug,
        title: data.title,
        level: data.level,
        topic: data.category,
        description: data.description,
        examples: data.examples ?? [],
        constraints: data.constraints ?? [],
        starter: data.starter,
        ...(data.solution ? { solution: data.solution } : {}),
        tests: (data.testCases ?? []).map((t: any) => ({ input: t.stdin, expected: t.expectedOutput })),
      },
    };
  },
  head: ({ loaderData }) => ({
    meta: [
      {
        title: loaderData
          ? `${loaderData.problem.title} — RoyalDsa`
          : "Problem — RoyalDsa",
      },
      {
        name: "description",
        content: loaderData?.problem.description.slice(0, 155) ?? "DSA problem",
      },
    ],
  }),
  notFoundComponent: () => (
    <div className="min-h-screen">
      <NavBar />
      <div className="mx-auto max-w-3xl px-4 py-24 text-center">
        <h1 className="text-3xl font-bold">Problem not found</h1>
        <Link
          to="/problems"
          className="mt-6 inline-flex items-center gap-2 text-neon-cyan hover:underline"
        >
          ← Back to problems
        </Link>
      </div>
    </div>
  ),
  errorComponent: ({ error }) => (
    <div className="min-h-screen">
      <NavBar />
      <div className="mx-auto max-w-3xl px-4 py-24 text-center">
        <h1 className="text-3xl font-bold">Something went wrong</h1>
        <p className="mt-2 text-muted-foreground">{error.message}</p>
      </div>
    </div>
  ),
  component: ProblemPage,
});

type Verdict = {
  passed: boolean;
  index: number;
  input: string;
  expected: string;
  actual: string;
  isHidden?: boolean;
  error?: string;
};

const CODE_PANE_THEME_KEY = "royaldsa_code_pane_theme";

function loadCodePaneTheme(): "match" | "black" {
  if (typeof window === "undefined") return "match";
  return window.localStorage.getItem(CODE_PANE_THEME_KEY) === "black" ? "black" : "match";
}

function ProblemPage() {
  const { problem } = Route.useLoaderData();
  const [lang, setLang] = useState<"java" | "python">("python");
  const [code, setCode] = useState({
    java: problem.starter.java,
    python: problem.starter.python,
  });
  const [tab, setTab] = useState<"description" | "tests" | "solution">("description");
  const [running, setRunning] = useState(false);
  const [verdicts, setVerdicts] = useState<Verdict[] | null>(null);
  const [consoleOut, setConsoleOut] = useState<string[]>([]);
  const [vizOpen, setVizOpen] = useState(false);
  const [vizLoading, setVizLoading] = useState(false);
  const [vizHtml, setVizHtml] = useState<string | null>(null);
  const [vizCached, setVizCached] = useState(false);
  const [vizError, setVizError] = useState<string | null>(null);
  const [codePaneTheme, setCodePaneTheme] = useState<"match" | "black">(() => loadCodePaneTheme());

  const toggleCodePaneTheme = () => {
    setCodePaneTheme((t) => {
      const next = t === "match" ? "black" : "match";
      if (typeof window !== "undefined") window.localStorage.setItem(CODE_PANE_THEME_KEY, next);
      return next;
    });
  };

  useEffect(() => {
    setVizHtml(null);
    setVizError(null);
    setVizCached(false);
    setVizOpen(false);
    setVizLoading(false);
  }, [problem.id]);

  const showSolutionTab =
    problem.solution != null &&
    (Boolean(problem.solution.java?.trim()) || Boolean(problem.solution.python?.trim()));

  useEffect(() => {
    if (tab === "solution" && !showSolutionTab) setTab("description");
  }, [tab, showSolutionTab, problem.id]);

  const idx = useMemo(() => problems.findIndex((p) => p.id === problem.id), [problem.id]);
  const next = idx >= 0 ? problems[(idx + 1) % problems.length] : problem;
  const prev = idx >= 0 ? problems[(idx - 1 + problems.length) % problems.length] : problem;

  const stableStringify = (v: unknown): string => {
    if (Array.isArray(v)) return "[" + v.map(stableStringify).join(",") + "]";
    if (typeof v === "string") return JSON.stringify(v);
    if (typeof v === "boolean" || v === null) return String(v);
    if (typeof v === "number") return Number.isInteger(v) ? String(v) : String(v);
    return JSON.stringify(v);
  };

  const run = async () => {
    const useBackendJudge = useApi;
    setRunning(true);
    setConsoleOut([
      `> ${lang === "java" ? "javac Solution.java && java Solution" : "python solution.py"}`,
      useBackendJudge
        ? `> submitting ${problem.tests.length} test cases to backend judge…`
        : `> running ${problem.tests.length} test cases (simulated)…`,
    ]);
    setVerdicts(null);

    if (!useBackendJudge) {
      setConsoleOut((c) => [
        ...c,
        "> local mode is enabled (VITE_USE_API is false).",
        "> your Java/Python code is not executed in local mode.",
        "> enable backend mode with VITE_USE_API=true and provide VITE_API_TOKEN for real judging.",
      ]);
      setRunning(false);
      setTab("tests");
      return;
    }

    const token = getApiToken();
    if (useBackendJudge && !token) {
      setConsoleOut((c) => [
        ...c,
        "> missing VITE_API_TOKEN. Backend judge is enabled, but no auth token was provided.",
        "> add VITE_API_TOKEN and run again.",
      ]);
      setRunning(false);
      setTab("tests");
      return;
    }

    if (useBackendJudge && token) {
      try {
        const created = await apiPost<{ submissionId: string }>("/submissions", {
          problemSlug: problem.id,
          sourceCode: code[lang],
          language: lang,
        });
        setConsoleOut((c) => [...c, `> queued submission ${created.submissionId}`]);
        let done = false;
        let attempts = 0;
        const upsertProgressLine = (line: string) => {
          setConsoleOut((current) => {
            const idx = current.findIndex((entry) => entry.startsWith("> progress: "));
            if (idx === -1) return [...current, line];
            const next = [...current];
            next[idx] = line;
            return next;
          });
        };
        while (!done && attempts < 30) {
          // eslint-disable-next-line no-await-in-loop
          await new Promise((r) => setTimeout(r, 1000));
          // eslint-disable-next-line no-await-in-loop
          const status = await apiGet<any>(`/submissions/${created.submissionId}`);
          if (status.status === "queued") {
            upsertProgressLine("> progress: 0/" + (status.testCasesTotal ?? problem.tests.length));
          } else if (status.status === "running") {
            const doneCount = Number(status.testCasesPassed ?? 0);
            const totalCount = Number(status.testCasesTotal ?? problem.tests.length);
            upsertProgressLine(`> progress: ${doneCount}/${totalCount}`);
          } else {
            done = true;
            const results = (status.testCaseResults ?? []).map((r: any, i: number) => ({
              index: i,
              input: r.stdin ?? problem.tests[i]?.input ?? "",
              expected: r.expectedOutput ?? problem.tests[i]?.expected ?? "",
              actual: r.stdout,
              passed: r.passed,
              isHidden: Boolean(r.isHidden),
              error: r.stderr || undefined,
            }));
            setVerdicts(results);
            setConsoleOut((c) => {
              const lines = [...c, `> completed: ${status.status}`];
              const failedIndex = results.findIndex((r) => !r.passed);
              if (failedIndex >= 0) {
                lines.push(
                  `> failed at test ${failedIndex + 1}/${status.testCasesTotal ?? problem.tests.length}: ${
                    results[failedIndex].error || "wrong output"
                  }`,
                );
              } else {
                lines.push(`> all tests passed: ${results.length}/${results.length}`);
              }
              return lines;
            });
          }
          attempts += 1;
        }
        if (!done) {
          setConsoleOut((c) => [
            ...c,
            "> still running after 30s.",
            "> judge is taking longer than expected. check backend worker logs.",
          ]);
        }
      } catch (e: any) {
        setConsoleOut((c) => [...c, `> submission failed: ${String(e?.message ?? e)}`]);
      } finally {
        setRunning(false);
        setTab("tests");
      }
      return;
    }
  };

  const reset = () => {
    setCode({ java: problem.starter.java, python: problem.starter.python });
    setVerdicts(null);
    setConsoleOut([]);
  };

  const runVisualize = async () => {
    setVizError(null);
    setVizHtml(null);
    setVizCached(false);
    setVizOpen(true);

    if (!useApi) {
      setVizError(
        "Visualization needs the RoyalDSA backend. Set VITE_USE_API=true and point VITE_API_BASE_URL at your API.",
      );
      return;
    }
    if (!getApiToken()) {
      setVizError("Sign in so we can generate and cache visualizations for your solution.");
      return;
    }

    setVizLoading(true);
    try {
      const data = await apiPost<{ html: string; cached: boolean }>(
        `/problems/${problem.id}/visualize`,
        { sourceCode: code[lang], language: lang },
      );
      setVizHtml(data.html);
      setVizCached(data.cached);
    } catch (e: unknown) {
      setVizError(e instanceof Error ? e.message : "Could not load visualization.");
    } finally {
      setVizLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <NavBar />
      <div className="border-b border-border/50 bg-card/40 backdrop-blur">
        <div className="mx-auto max-w-[1600px] px-4 md:px-6 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <Link
              to="/problems"
              className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-smooth"
            >
              <ArrowLeft className="h-4 w-4" /> <span className="hidden sm:inline">Problems</span>
            </Link>
            <div className="h-4 w-px bg-border" />
            <h1 className="font-semibold truncate">{problem.title}</h1>
            <LevelBadge level={problem.level} />
          </div>
          <div className="flex items-center gap-2">
            <Link
              to="/problems/$id"
              params={{ id: prev.id }}
              className="px-2 py-1 rounded text-xs font-mono text-muted-foreground hover:text-foreground hover:bg-muted transition-smooth"
            >
              ← prev
            </Link>
            <Link
              to="/problems/$id"
              params={{ id: next.id }}
              className="px-2 py-1 rounded text-xs font-mono text-muted-foreground hover:text-foreground hover:bg-muted transition-smooth"
            >
              next →
            </Link>
          </div>
        </div>
      </div>

      <main className="flex-1 mx-auto max-w-[1600px] w-full px-4 md:px-6 py-4">
        <div className="grid lg:grid-cols-2 gap-4">
          {/* Left: description */}
          <section className="rounded-xl border border-border/60 bg-gradient-card overflow-hidden flex flex-col">
            <div className="flex items-center border-b border-border/60 px-2">
              {(
                [
                  ["description", "Problem"],
                  [
                    "tests",
                    verdicts ? `Tests (${verdicts.filter((v) => v.passed).length}/${verdicts.length})` : "Tests",
                  ],
                  ...(showSolutionTab ? ([["solution", "Solution"]] as const) : []),
                ] as const
              ).map(([k, label]) => (
                <button
                  key={k}
                  onClick={() => setTab(k)}
                  className={`px-4 py-3 text-sm font-medium transition-smooth border-b-2 ${
                    tab === k
                      ? "text-neon-cyan border-neon-cyan"
                      : "text-muted-foreground border-transparent hover:text-foreground"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="flex-1 overflow-y-auto p-6 max-h-[calc(100vh-220px)]">
              {tab === "description" && <Description />}
              {tab === "tests" && <TestsView verdicts={verdicts} tests={problem.tests} />}
              {tab === "solution" && <SolutionView />}
            </div>
          </section>

          {/* Right: editor + console — optional black IDE strip (scoped vars only) */}
          <section className={`flex flex-col gap-3 ${codePaneTheme === "black" ? "coding-pane-black" : ""}`}>
            <div className="rounded-xl border border-border/60 bg-card/40 backdrop-blur overflow-hidden">
              <div className="flex items-center justify-between px-3 py-2 border-b border-border/60">
                <div className="flex items-center gap-1">
                  {(["python", "java"] as const).map((l) => (
                    <button
                      key={l}
                      onClick={() => setLang(l)}
                      className={`px-3 py-1 rounded text-xs font-mono uppercase transition-smooth ${
                        lang === l
                          ? "bg-gradient-primary text-primary-foreground"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {l}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={reset}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-mono text-muted-foreground hover:text-foreground transition-smooth"
                  >
                    <RotateCcw className="h-3.5 w-3.5" /> reset
                  </button>
                  <button
                    type="button"
                    onClick={toggleCodePaneTheme}
                    aria-label={
                      codePaneTheme === "black"
                        ? "Editor area: match app theme"
                        : "Editor area: black coding theme"
                    }
                    aria-pressed={codePaneTheme === "black"}
                    title={
                      codePaneTheme === "black"
                        ? "Switch editor & console to app colors"
                        : "Black background for editor & console only"
                    }
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded border border-border/80 bg-card/60 text-xs font-mono text-muted-foreground hover:bg-muted/60 hover:text-foreground transition-smooth"
                  >
                    {codePaneTheme === "black" ? (
                      <Sun className="h-3.5 w-3.5 text-neon-amber" />
                    ) : (
                      <Moon className="h-3.5 w-3.5 text-neon-violet" />
                    )}
                    Code
                  </button>
                  <button
                    type="button"
                    onClick={() => void runVisualize()}
                    disabled={vizLoading}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded border border-border/80 bg-card/60 text-xs font-mono text-neon-violet hover:bg-muted/60 transition-smooth disabled:opacity-60"
                  >
                    {vizLoading ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Sparkles className="h-3.5 w-3.5" />
                    )}
                    Visualize
                  </button>
                  <button
                    onClick={run}
                    disabled={running}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-gradient-primary text-primary-foreground text-xs font-bold uppercase tracking-wider shadow-glow-cyan transition-smooth hover:scale-[1.04] disabled:opacity-60"
                  >
                    <Play className="h-3.5 w-3.5" />
                    {running ? "Running…" : "Run"}
                  </button>
                </div>
              </div>
              <CodeEditor
                value={code[lang]}
                onChange={(v) => setCode({ ...code, [lang]: v })}
                language={lang}
              />
            </div>

            <div className="rounded-xl border border-border/60 bg-card/40 backdrop-blur overflow-hidden flex-1">
              <div className="flex items-center justify-between px-3 py-2 border-b border-border/60">
                <div className="flex items-center gap-2">
                  <ChevronRight className="h-3.5 w-3.5 text-neon-lime" />
                  <span className="text-xs font-mono uppercase tracking-widest text-muted-foreground">
                    Console
                  </span>
                </div>
                {verdicts && (
                  <span
                    className="text-xs font-mono"
                    style={{
                      color:
                        verdicts.every((v) => v.passed)
                          ? "var(--neon-lime)"
                          : "var(--destructive)",
                    }}
                  >
                    {verdicts.every((v) => v.passed)
                      ? "ALL TESTS PASSED ✓"
                      : `${verdicts.filter((v) => !v.passed).length} FAILING`}
                  </span>
                )}
              </div>
              <pre
                className="px-4 py-3 text-[12px] leading-6 font-mono overflow-auto max-h-[40vh]"
                style={{
                  background: "var(--editor-bg)",
                  color: "var(--coding-pane-fg, var(--foreground))",
                }}
              >
                {consoleOut.length === 0 ? (
                  <span className="text-muted-foreground">
                    // Click <span className="text-neon-cyan">Run</span> to execute against test cases.
                    {"\n"}// Note: executor is simulated — verdicts come from a reference solution.
                  </span>
                ) : (
                  consoleOut.map((l, i) => (
                    <div
                      key={i}
                      style={{
                        color: l.includes("✓ PASS")
                          ? "var(--neon-lime)"
                          : l.includes("✗ FAIL")
                            ? "var(--destructive)"
                            : l.startsWith(">")
                              ? "var(--neon-cyan)"
                              : "var(--coding-pane-fg, var(--foreground))",
                      }}
                    >
                      {l}
                    </div>
                  ))
                )}
              </pre>
            </div>
          </section>
        </div>
      </main>

      <Dialog open={vizOpen} onOpenChange={setVizOpen}>
        <DialogContent className="max-w-[min(96vw,1100px)] w-full max-h-[90vh] p-0 gap-0 flex flex-col overflow-hidden border-border/60">
          <DialogHeader className="px-6 pt-6 pb-3 pr-14 shrink-0 border-b border-border/60 text-left space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <DialogTitle className="text-lg">Visualization</DialogTitle>
              {vizCached && !vizLoading && vizHtml && (
                <Badge variant="secondary" className="text-[10px] uppercase tracking-wider">
                  From cache
                </Badge>
              )}
            </div>
            <DialogDescription className="text-xs">
              Interactive HTML for your current {lang} solution. Cached per problem, language, and exact
              source code.
            </DialogDescription>
          </DialogHeader>
          <div className="relative flex-1 min-h-[min(70vh,720px)] bg-muted/20">
            {vizLoading && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 z-10 bg-background/80">
                <Loader2 className="h-10 w-10 animate-spin text-neon-cyan" />
                <p className="text-sm text-muted-foreground">Generating visualization…</p>
              </div>
            )}
            {vizError && !vizLoading && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-8 text-center">
                <p className="text-sm text-destructive max-w-md">{vizError}</p>
                {useApi && !getApiToken() && (
                  <Link
                    to="/login"
                    className="text-sm font-medium text-neon-cyan hover:underline"
                    onClick={() => setVizOpen(false)}
                  >
                    Go to sign in
                  </Link>
                )}
              </div>
            )}
            {vizHtml && !vizLoading && (
              <iframe
                title="Algorithm visualization"
                srcDoc={vizHtml}
                sandbox="allow-scripts"
                className="absolute inset-0 w-full h-full border-0 bg-background"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );

  function Description() {
    return (
      <div className="space-y-5">
        <div className="flex items-center gap-2 text-xs font-mono">
          <span className="px-2 py-0.5 rounded bg-muted text-muted-foreground">
            {problem.topic}
          </span>
        </div>

        <p className="text-foreground/90 leading-relaxed">{problem.description}</p>

        <div>
          <h3 className="text-sm font-semibold text-neon-cyan mb-2 uppercase tracking-widest">
            Examples
          </h3>
          <div className="space-y-3">
            {problem.examples.map((ex, i) => (
              <div
                key={i}
                className="rounded-lg border border-border bg-card/60 p-3 font-mono text-xs"
              >
                <div>
                  <span className="text-muted-foreground">Input: </span>
                  <span className="text-neon-amber">{ex.input}</span>
                </div>
                <div className="mt-1">
                  <span className="text-muted-foreground">Output: </span>
                  <span className="text-neon-lime">{ex.output}</span>
                </div>
                {ex.explanation ? (
                  <div className="mt-2 border-t border-border/60 pt-2 text-[12px] leading-relaxed">
                    <span className="font-semibold text-foreground/90">Explanation: </span>
                    <span className="text-muted-foreground">{ex.explanation}</span>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </div>

        {problem.constraints.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-neon-cyan mb-2 uppercase tracking-widest">
              Constraints
            </h3>
            <ul className="space-y-1 text-sm font-mono text-muted-foreground">
              {problem.constraints.map((c, i) => (
                <li key={i}>• {c}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex items-start gap-3 rounded-lg border border-neon-magenta/30 bg-neon-magenta/5 p-3">
          <Lightbulb className="h-4 w-4 text-neon-magenta mt-0.5 flex-shrink-0" />
          <div className="text-xs text-muted-foreground">
            Code execution is <span className="text-neon-magenta font-semibold">simulated</span>:
            verdicts are computed by a reference implementation, not by actually compiling your
            Java/Python code.
          </div>
        </div>
      </div>
    );
  }

  function SolutionView() {
    if (!problem.solution) return null;
    return (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          One valid approach in each language. Try to write your own first!
        </p>
        <div>
          <div className="text-xs font-mono uppercase tracking-widest text-neon-amber mb-2">
            Java
          </div>
          <pre
            className="rounded-lg border border-border p-4 text-[12.5px] leading-6 font-mono overflow-x-auto whitespace-pre"
            style={{ background: "var(--editor-bg)" }}
          >
            {problem.solution.java}
          </pre>
        </div>
        <div>
          <div className="text-xs font-mono uppercase tracking-widest text-neon-cyan mb-2">
            Python
          </div>
          <pre
            className="rounded-lg border border-border p-4 text-[12.5px] leading-6 font-mono overflow-x-auto whitespace-pre"
            style={{ background: "var(--editor-bg)" }}
          >
            {problem.solution.python}
          </pre>
        </div>
      </div>
    );
  }
}

function TestsView({
  verdicts,
  tests,
}: {
  verdicts: Verdict[] | null;
  tests: { input: string; expected: string }[];
}) {
  if (!verdicts) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">
          {tests.length} test cases. Hit <span className="text-neon-cyan">Run</span> to evaluate.
        </p>
        {tests.map((t, i) => (
          <div
            key={i}
            className="rounded-lg border border-border bg-card/40 p-3 font-mono text-xs"
          >
            <div className="text-muted-foreground mb-1">Test {i + 1}</div>
            <div>
              <span className="text-muted-foreground">in: </span>
              <span className="text-neon-amber">{t.input}</span>
            </div>
            <div>
              <span className="text-muted-foreground">expected: </span>
              <span className="text-neon-lime">{t.expected}</span>
            </div>
          </div>
        ))}
      </div>
    );
  }

  const sampleCount = tests.length;
  const sampleVerdicts = verdicts.filter((v) => !v.isHidden).slice(0, sampleCount);
  const hiddenFailed = verdicts.filter((v) => v.isHidden && !v.passed);
  const rows = [...sampleVerdicts, ...hiddenFailed];

  return (
    <div className="space-y-3">
      {rows.map((v) => (
        <div
          key={`${v.index}-${v.isHidden ? "hidden" : "sample"}`}
          className="rounded-lg border p-3 font-mono text-xs"
          style={{
            borderColor: v.passed
              ? "color-mix(in oklab, var(--neon-lime) 40%, transparent)"
              : "color-mix(in oklab, var(--destructive) 40%, transparent)",
            background: v.passed
              ? "color-mix(in oklab, var(--neon-lime) 5%, transparent)"
              : "color-mix(in oklab, var(--destructive) 5%, transparent)",
          }}
        >
          <div className="flex items-center justify-between mb-1.5">
            <div className="font-semibold flex items-center gap-1.5">
              {v.passed ? (
                <CheckCircle2 className="h-3.5 w-3.5 text-neon-lime" />
              ) : (
                <XCircle className="h-3.5 w-3.5 text-destructive" />
              )}
              {v.isHidden ? `Hidden Test ${v.index + 1}` : `Sample Test ${v.index + 1}`}
            </div>
            <span
              className="text-[10px] uppercase tracking-widest"
              style={{ color: v.passed ? "var(--neon-lime)" : "var(--destructive)" }}
            >
              {v.passed ? "Pass" : "Fail"}
            </span>
          </div>
          <div>
            <span className="text-muted-foreground">in: </span>
            <span className="text-neon-amber">{v.input}</span>
          </div>
          <div>
            <span className="text-muted-foreground">expected: </span>
            <span className="text-neon-lime">{v.expected}</span>
          </div>
          {v.error ? (
            <div className="mt-1.5">
              <div className="text-muted-foreground mb-0.5">runtime error (stderr)</div>
              <pre className="max-h-48 overflow-auto whitespace-pre-wrap break-words rounded border border-destructive/30 bg-destructive/5 p-2 text-[11px] leading-snug text-destructive">
                {v.error.trim()}
              </pre>
            </div>
          ) : (
            <div>
              <span className="text-muted-foreground">got: </span>
              <span className={v.passed ? "text-neon-lime" : "text-destructive"}>{v.actual || "(empty)"}</span>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

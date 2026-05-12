import { createFileRoute, useBlocker } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { NavBar } from "@/components/NavBar";
import { CodeEditor } from "@/components/CodeEditor";
import { apiGet, apiPost, apiPostKeepalive, apiPut, useApi } from "@/lib/api";
import { CheckCircle2, Code2, Play, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { requireAuthBeforeLoad } from "@/lib/auth-guard";

export const Route = createFileRoute("/tests/assigned")({
  beforeLoad: () => requireAuthBeforeLoad(),
  component: TakeAssignedTestPage,
});

type AssignmentItem = {
  _id: string;
  createdAt?: string;
  dueAt: string;
  startAt: string;
  status: "scheduled" | "active" | "closed" | "cancelled";
  isAvailable: boolean;
  effectiveStatus: "scheduled" | "active" | "closed" | "cancelled";
  test: { _id: string; title: string; durationMin: number; instructions?: string } | null;
  latestSession: { _id: string; status: string; aggregate?: { problemsCompleted?: number } } | null;
};

type SessionProblemState = {
  problemId: string;
  language: "java" | "python";
  currentCode: string;
  finalCode?: string;
  isSubmitted: boolean;
};

type SessionPayload = {
  session: {
    _id: string;
    status: "not_started" | "in_progress" | "submitted" | "auto_submitted" | "expired";
    startedAt?: string;
    expiresAt?: string;
    problemStates: SessionProblemState[];
    aggregate?: { problemsCompleted?: number };
  };
  assignment: { _id: string; dueAt: string; startAt: string };
  test: {
    _id: string;
    title: string;
    instructions?: string;
    problemIds: string[];
    durationMin?: number;
  };
  problems: Array<{
    _id: string;
    title: string;
    category: string;
    level: number;
    description: string;
    examples: Array<{ input: string; output: string; explanation?: string }>;
    constraints: string[];
    starter: { java: string; python: string };
  }>;
};

type RunEvent = {
  _id: string;
  runNo: number;
  status: "queued" | "running" | "accepted" | "failed" | "runtime_error" | "compile_error";
  testCasesPassed: number;
  testCasesTotal: number;
  testCaseResults: Array<{
    isHidden?: boolean;
    stdinSnapshot: string;
    expectedOutputSnapshot: string;
    stdout: string;
    stderr: string;
    passed: boolean;
  }>;
  submittedAt: string;
};

/** Learner-visible rows only (exclude judge hidden cases). Legacy runs without `isHidden` show all rows until re-run. */
function sampleCaseRows(run: RunEvent | null): RunEvent["testCaseResults"] {
  if (!run) return [];
  return run.testCaseResults.filter((r) => r.isHidden !== true);
}

function sampleCaseSummary(run: RunEvent | null) {
  const rows = sampleCaseRows(run);
  const passed = rows.filter((r) => r.passed).length;
  return { passed, total: rows.length, rows };
}

function splitMinSec(totalSeconds: number): { minutes: number; seconds: number } {
  const s = Math.max(0, Math.floor(totalSeconds));
  return { minutes: Math.floor(s / 60), seconds: s % 60 };
}

function assignmentTakeState(a: AssignmentItem): "not_taken" | "in_progress" | "finished" | "upcoming" | "closed" {
  if (a.effectiveStatus === "cancelled") return "closed";
  if (!a.isAvailable) {
    if (a.effectiveStatus === "scheduled") return "upcoming";
    return "closed";
  }
  const st = a.latestSession?.status;
  if (!st || st === "not_started") return "not_taken";
  if (st === "in_progress") return "in_progress";
  return "finished";
}

function assignmentCardClass(a: AssignmentItem) {
  const t = assignmentTakeState(a);
  const base =
    "rounded-xl border p-4 text-left transition-smooth w-full ";
  if (t === "upcoming" || t === "closed") {
    return base + "border-border/50 bg-muted/20 opacity-75";
  }
  if (t === "not_taken") {
    return base + "border-amber-500/45 bg-amber-500/[0.07] hover:bg-amber-500/15";
  }
  if (t === "in_progress") {
    return base + "border-neon-cyan/50 bg-neon-cyan/[0.08] hover:bg-neon-cyan/15";
  }
  return base + "border-emerald-600/35 bg-emerald-600/[0.06] hover:bg-emerald-600/12";
}

type ProblemEdit = {
  language: "java" | "python";
  currentCode: string;
};

function TakeAssignedTestPage() {
  const [loading, setLoading] = useState(true);
  const [assignments, setAssignments] = useState<AssignmentItem[]>([]);
  const [sessionData, setSessionData] = useState<SessionPayload | null>(null);
  const [activeProblemIdx, setActiveProblemIdx] = useState(0);
  const [problemEdits, setProblemEdits] = useState<Record<string, ProblemEdit>>({});
  const sessionDataRef = useRef<SessionPayload | null>(null);
  const activeProblemIdRef = useRef("");
  const problemEditsRef = useRef(problemEdits);
  /** Prevents duplicate auto-leave submissions (visibility + blocker + pagehide). */
  const autoLeaveInFlightRef = useRef(false);
  const autoSubmitToastShownRef = useRef<Set<string>>(new Set());
  /** One-shot auto-submit when assignment due passes while session is open. */
  const dueDeadlineSubmitDoneRef = useRef(false);
  /** Live clock for duration / due countdowns. */
  const [timerTick, setTimerTick] = useState(0);
  const [runsByProblem, setRunsByProblem] = useState<Record<string, RunEvent[]>>({});
  /** Console lines keyed by problem id so switching problems does not bleed output. */
  const [consoleByProblem, setConsoleByProblem] = useState<Record<string, string[]>>({});
  const [running, setRunning] = useState(false);
  const [saving, setSaving] = useState(false);
  const [submittingAll, setSubmittingAll] = useState(false);

  const activeProblemId = sessionData?.test.problemIds[activeProblemIdx] ?? "";
  sessionDataRef.current = sessionData;
  activeProblemIdRef.current = activeProblemId;
  problemEditsRef.current = problemEdits;

  const activeProblem = useMemo(
    () => sessionData?.problems.find((p) => String(p._id) === activeProblemId),
    [sessionData, activeProblemId],
  );
  const activeEdit = problemEdits[activeProblemId];
  const latestRun = runsByProblem[activeProblemId]?.at(-1) ?? null;
  /** Hide previous run rows while a new run is in flight; counts/cards refresh when it completes. */
  const displayRun = running ? null : latestRun;
  const displaySampleSummary = sampleCaseSummary(displayRun);
  const sortedAssignments = useMemo(() => {
    return [...assignments].sort((a, b) => {
      const ta = new Date(a.createdAt ?? a.startAt ?? 0).getTime();
      const tb = new Date(b.createdAt ?? b.startAt ?? 0).getTime();
      return tb - ta;
    });
  }, [assignments]);
  const activeConsole = consoleByProblem[activeProblemId] ?? [];

  const loadAssignments = useCallback(async (opts?: { silent?: boolean }) => {
    if (!useApi) {
      toast.error("Enable VITE_USE_API=true to use assigned tests.");
      setLoading(false);
      return;
    }
    const silent = opts?.silent ?? false;
    try {
      if (!silent) setLoading(true);
      const items = await apiGet<AssignmentItem[]>("/assigned-tests/assigned/me");
      setAssignments(items ?? []);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Could not load assigned tests.");
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadAssignments();
  }, [loadAssignments]);

  useEffect(() => {
    if (!sessionData || sessionData.session.status !== "in_progress") return;
    const id = window.setInterval(() => setTimerTick((n) => n + 1), 1000);
    return () => window.clearInterval(id);
  }, [sessionData?.session._id, sessionData?.session.status]);

  useEffect(() => {
    if (!sessionData || sessionData.session.status !== "auto_submitted") return;
    const sid = sessionData.session._id;
    if (autoSubmitToastShownRef.current.has(sid)) return;
    autoSubmitToastShownRef.current.add(sid);
    toast.warning("Test auto-submitted", {
      description:
        "You left the test (switched tab, opened another app, changed page, or closed the window). Your work up to that point was saved.",
      duration: 12_000,
    });
  }, [sessionData?.session._id, sessionData?.session.status]);

  const saveDraftFromRefs = useCallback(async () => {
    const s = sessionDataRef.current;
    if (!s) return;
    const pid = activeProblemIdRef.current;
    const edit = problemEditsRef.current[pid];
    if (!pid || !edit) return;
    setSaving(true);
    try {
      await apiPut(`/assigned-tests/session/${s.session._id}/problems/${pid}/code`, {
        language: edit.language,
        currentCode: edit.currentCode,
      });
    } finally {
      setSaving(false);
    }
  }, []);

  const finalizeAutoLeave = useCallback(async () => {
    const s = sessionDataRef.current;
    if (!s || s.session.status !== "in_progress" || autoLeaveInFlightRef.current) return;
    autoLeaveInFlightRef.current = true;
    try {
      await saveDraftFromRefs();
      const updated = await apiPost<SessionPayload["session"]>(`/assigned-tests/session/${s.session._id}/submit`, {
        source: "auto_leave",
      });
      setSessionData((prev) => (prev ? { ...prev, session: updated } : prev));
      void loadAssignments({ silent: true });
    } catch {
      toast.error("Could not auto-submit your test. Check your connection and try again.");
    } finally {
      autoLeaveInFlightRef.current = false;
    }
  }, [loadAssignments, saveDraftFromRefs]);

  const navBlocker = useBlocker({
    shouldBlockFn: ({ current, next }) => {
      const sess = sessionDataRef.current;
      if (!sess || sess.session.status !== "in_progress") return false;
      if (current.routeId !== "/tests/assigned") return false;
      if (next.routeId === "/tests/assigned") return false;
      return true;
    },
    withResolver: true,
    enableBeforeUnload: true,
  });

  useEffect(() => {
    if (navBlocker.status !== "blocked") return;
    void (async () => {
      await finalizeAutoLeave();
      navBlocker.proceed?.();
    })();
  }, [navBlocker.status, navBlocker.proceed, finalizeAutoLeave]);

  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === "hidden") void finalizeAutoLeave();
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [finalizeAutoLeave]);

  useEffect(() => {
    const onPageHide = (e: PageTransitionEvent) => {
      if (e.persisted) return;
      const s = sessionDataRef.current;
      if (!s || s.session.status !== "in_progress") return;
      apiPostKeepalive(`/assigned-tests/session/${s.session._id}/submit`, { source: "auto_leave" });
    };
    window.addEventListener("pagehide", onPageHide);
    return () => window.removeEventListener("pagehide", onPageHide);
  }, []);

  /** Assignment due passed — server would reject saves; submit once to finalize. */
  useEffect(() => {
    const s = sessionDataRef.current;
    if (!s || s.session.status !== "in_progress" || dueDeadlineSubmitDoneRef.current) return;
    const dueMs = new Date(s.assignment.dueAt).getTime();
    if (Date.now() < dueMs) return;
    dueDeadlineSubmitDoneRef.current = true;
    toast.warning("Assignment deadline reached — submitting your test.", { duration: 8000 });
    void finalizeAutoLeave();
  }, [timerTick, finalizeAutoLeave, sessionData?.session.status]);

  const hydrateSession = async (sessionId: string) => {
    autoLeaveInFlightRef.current = false;
    dueDeadlineSubmitDoneRef.current = false;
    const payload = await apiGet<SessionPayload>(`/assigned-tests/session/${sessionId}`);
    setSessionData(payload);
    setActiveProblemIdx(0);
    const edits: Record<string, ProblemEdit> = {};
    for (const p of payload.session.problemStates) {
      edits[String(p.problemId)] = {
        language: p.language,
        currentCode: p.currentCode,
      };
    }
    for (const p of payload.problems) {
      const id = String(p._id);
      if (!edits[id]) {
        edits[id] = { language: "python", currentCode: p.starter.python };
      }
    }
    setProblemEdits(edits);
    setRunsByProblem({});
    setConsoleByProblem({});
  };

  const openAssignment = async (assignmentId: string) => {
    try {
      setLoading(true);
      const started = await apiPost<{ _id: string }>(`/assigned-tests/${assignmentId}/start`, {});
      await hydrateSession(started._id);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Could not open assigned test.");
    } finally {
      setLoading(false);
    }
  };

  const saveCurrentProblemCode = async () => {
    if (!sessionData || !activeProblemId || !activeEdit) return;
    setSaving(true);
    try {
      await apiPut(`/assigned-tests/session/${sessionData.session._id}/problems/${activeProblemId}/code`, {
        language: activeEdit.language,
        currentCode: activeEdit.currentCode,
      });
    } finally {
      setSaving(false);
    }
  };

  const loadRunsForProblem = async (problemId: string) => {
    if (!sessionData) return;
    const runs = await apiGet<RunEvent[]>(
      `/assigned-tests/session/${sessionData.session._id}/problems/${problemId}/runs`,
    );
    setRunsByProblem((prev) => ({ ...prev, [problemId]: runs ?? [] }));
  };

  useEffect(() => {
    if (!sessionData || !activeProblemId) return;
    if (!runsByProblem[activeProblemId]) {
      void loadRunsForProblem(activeProblemId);
    }
  }, [sessionData, activeProblemId]);

  const runCurrent = async () => {
    if (!sessionData || !activeProblemId || !activeEdit) return;
    const pid = activeProblemId;
    const startLines = [
      `> ${activeEdit.language === "java" ? "javac Solution.java && java Main" : "python solution.py"}`,
      `> running test cases for ${activeProblem?.title ?? "problem"}...`,
    ];
    setRunning(true);
    setConsoleByProblem((prev) => ({ ...prev, [pid]: startLines }));
    try {
      await saveCurrentProblemCode();
      const run = await apiPost<RunEvent>(
        `/assigned-tests/session/${sessionData.session._id}/problems/${pid}/run`,
        {
          language: activeEdit.language,
          sourceCode: activeEdit.currentCode,
        },
      );
      setRunsByProblem((prev) => ({
        ...prev,
        [pid]: [...(prev[pid] ?? []), run],
      }));
      const { passed, total } = sampleCaseSummary(run);
      setConsoleByProblem((prev) => ({
        ...prev,
        [pid]: [
          ...(prev[pid] ?? startLines),
          `> run #${run.runNo} completed: ${run.status}`,
          `> sample tests passed ${passed}/${total}`,
        ],
      }));
      const updated = await apiGet<SessionPayload>(`/assigned-tests/session/${sessionData.session._id}`);
      setSessionData(updated);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error(msg.length > 120 ? `${msg.slice(0, 120)}…` : msg);
      setConsoleByProblem((prev) => ({
        ...prev,
        [pid]: [...(prev[pid] ?? startLines), `> run failed: ${e instanceof Error ? e.message : String(e)}`],
      }));
    } finally {
      setRunning(false);
    }
  };

  const submitTest = async () => {
    if (!sessionData) return;
    setSubmittingAll(true);
    try {
      await saveCurrentProblemCode();
      const updated = await apiPost<SessionPayload["session"]>(
        `/assigned-tests/session/${sessionData.session._id}/submit`,
        { source: "manual" },
      );
      setSessionData((prev) => (prev ? { ...prev, session: updated } : prev));
      setConsoleByProblem((prev) => ({
        ...prev,
        [activeProblemId]: [...(prev[activeProblemId] ?? []), "> test submitted successfully"],
      }));
      await loadAssignments();
      toast.success("Test submitted successfully.");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Could not submit test.");
    } finally {
      setSubmittingAll(false);
    }
  };

  const goToProblem = async (idx: number) => {
    await saveCurrentProblemCode();
    setActiveProblemIdx(idx);
  };

  /** Test writing window from session start (soft limit — learner can keep coding until submit/due). */
  const durationClock = useMemo(() => {
    if (!sessionData || sessionData.session.status !== "in_progress") return null;
    const durMin = Math.max(1, Number(sessionData.test.durationMin ?? 60));
    const startedRaw = sessionData.session.startedAt;
    const startedMs = startedRaw ? new Date(startedRaw).getTime() : Date.now();
    const durationEndMs = startedMs + durMin * 60_000;
    const now = Date.now();
    const deltaSec = Math.floor((durationEndMs - now) / 1000);
    if (deltaSec > 0) {
      const { minutes, seconds } = splitMinSec(deltaSec);
      return { mode: "remaining" as const, minutes, seconds };
    }
    const overSec = Math.floor((now - durationEndMs) / 1000);
    const { minutes, seconds } = splitMinSec(overSec);
    return { mode: "over" as const, minutes, seconds };
  }, [sessionData, timerTick]);


  return (
    <div className="min-h-screen">
      <NavBar />
      <main className="mx-auto max-w-[1600px] px-3 md:px-6 py-4">
        {!sessionData ? (
          <section className="rounded-2xl border border-border/60 bg-gradient-card p-6 md:p-8">
            <div className="inline-flex items-center gap-2 text-neon-lime">
              <Code2 className="h-5 w-5" />
              <span className="text-xs font-mono uppercase tracking-widest">Learner Zone</span>
            </div>
            <h1 className="mt-2 text-3xl font-extrabold">Take Assigned Test</h1>
            <p className="mt-2 text-muted-foreground">Assigned coding tests for users are listed here.</p>
            <div className="mt-5 grid gap-3">
              {loading && (
                <div className="rounded-lg border border-border bg-card/30 px-4 py-3 text-sm text-muted-foreground">
                  Loading assigned tests...
                </div>
              )}
              {!loading && assignments.length === 0 && (
                <div className="rounded-lg border border-border bg-card/30 px-4 py-3 text-sm text-muted-foreground">
                  No assigned tests right now.
                </div>
              )}
              {sortedAssignments.map((a) => {
                const take = assignmentTakeState(a);
                const label =
                  take === "not_taken"
                    ? "Not started"
                    : take === "in_progress"
                      ? "In progress"
                      : take === "finished"
                        ? "Submitted"
                        : take === "upcoming"
                          ? "Opens soon"
                          : "Closed";
                return (
                <button
                  key={a._id}
                  onClick={() => void openAssignment(a._id)}
                  disabled={!a.isAvailable || !a.test}
                  className={`${assignmentCardClass(a)}${!a.isAvailable || !a.test ? " opacity-60 cursor-not-allowed" : ""}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <div className="font-semibold">{a.test?.title ?? "Untitled test"}</div>
                      <div className="text-xs text-muted-foreground">
                        Due: {new Date(a.dueAt).toLocaleString()} · {label}
                      </div>
                    </div>
                    <span className="text-xs font-mono px-2 py-1 rounded bg-background/50 border border-border/60">
                      {a.latestSession?.aggregate?.problemsCompleted ?? 0} solved
                    </span>
                  </div>
                </button>
              );
              })}
            </div>
          </section>
        ) : (
          <div className="space-y-3">
            <div className="rounded-xl border border-border/60 bg-card/40 px-4 py-3 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="text-xs text-muted-foreground">My Tests</div>
                <h1 className="font-semibold truncate">{sessionData.test.title}</h1>
              </div>
              <div className="flex flex-wrap items-center justify-end gap-2">
                {durationClock && (
                  <div
                    className={`flex flex-col items-end rounded-md border px-2 py-1 font-mono text-xs leading-tight ${
                      durationClock.mode === "over"
                        ? "border-destructive/60 bg-destructive/10 text-destructive"
                        : "border-border bg-muted text-foreground"
                    }`}
                    title="Time allowed for this test from when you opened it. You can keep editing after it passes until you submit or the assignment ends."
                  >
                    <span className="text-[10px] uppercase tracking-wide opacity-80">Test time</span>
                    {durationClock.mode === "remaining" ? (
                      <span>
                        {durationClock.minutes}m {durationClock.seconds}s left
                      </span>
                    ) : (
                      <span className="font-semibold">
                        Over {durationClock.minutes}m {durationClock.seconds}s
                      </span>
                    )}
                  </div>
                )}
                <span className="text-xs text-muted-foreground tabular-nums">
                  {sessionData.session.aggregate?.problemsCompleted ?? 0}/{sessionData.test.problemIds.length} solved
                </span>
                <button
                  onClick={() => void submitTest()}
                  disabled={submittingAll || sessionData.session.status !== "in_progress"}
                  className="px-3 py-1.5 rounded bg-gradient-primary text-primary-foreground text-xs font-bold disabled:opacity-60"
                >
                  {submittingAll ? "Submitting..." : "Submit Test"}
                </button>
              </div>
            </div>

            <div className="grid lg:grid-cols-[300px_1fr_1fr] gap-3">
              <aside className="rounded-xl border border-border/60 bg-card/40 p-3 space-y-2 max-h-[calc(100vh-170px)] overflow-auto">
                <div className="text-xs font-mono uppercase tracking-widest text-muted-foreground px-1">Problems</div>
                {sessionData.test.problemIds.map((pid, idx) => {
                  const p = sessionData.problems.find((x) => String(x._id) === pid);
                  const completed = runsByProblem[pid]?.some((r) => r.status === "accepted");
                  return (
                    <button
                      key={pid}
                      onClick={() => void goToProblem(idx)}
                      className={`w-full text-left rounded-lg border px-3 py-2 ${
                        idx === activeProblemIdx
                          ? "border-neon-cyan bg-neon-cyan/10"
                          : "border-border hover:bg-muted/40"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <div className="text-sm font-medium">{idx + 1}. {p?.title ?? "Problem"}</div>
                          <div className="text-[11px] text-muted-foreground">{p?.category ?? "-"}</div>
                        </div>
                        {completed && <CheckCircle2 className="h-4 w-4 text-neon-lime" />}
                      </div>
                    </button>
                  );
                })}
              </aside>

              <section className="rounded-xl border border-border/60 bg-gradient-card overflow-hidden flex flex-col">
                <div className="px-4 py-3 border-b border-border/60">
                  <h2 className="font-semibold">{activeProblem?.title ?? "Problem"}</h2>
                  <div className="text-xs text-muted-foreground">{activeProblem?.category ?? ""}</div>
                </div>
                <div className="p-4 overflow-auto max-h-[calc(100vh-220px)] space-y-4">
                  <p className="text-sm leading-relaxed">{activeProblem?.description}</p>
                  {activeProblem?.examples?.length ? (
                    <div>
                      <h3 className="text-xs font-semibold uppercase tracking-widest text-neon-cyan mb-2">Examples</h3>
                      <div className="space-y-2">
                        {activeProblem.examples.map((ex, i) => (
                          <div key={i} className="rounded border border-border bg-card/40 p-3 text-xs">
                            <div className="font-mono">
                              <div><span className="text-muted-foreground">in:</span> {ex.input}</div>
                              <div className="mt-0.5">
                                <span className="text-muted-foreground">out:</span> {ex.output}
                              </div>
                            </div>
                            {ex.explanation ? (
                              <p className="mt-2 text-[11px] leading-snug text-muted-foreground font-sans border-t border-border/50 pt-2">
                                <span className="font-medium text-foreground/80">Explanation: </span>
                                {ex.explanation}
                              </p>
                            ) : null}
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}
                  {!!activeProblem?.constraints?.length && (
                    <div>
                      <h3 className="text-xs font-semibold uppercase tracking-widest text-neon-cyan mb-2">Constraints</h3>
                      <ul className="text-xs text-muted-foreground list-disc pl-4 space-y-1">
                        {activeProblem.constraints.map((c, i) => <li key={i}>{c}</li>)}
                      </ul>
                    </div>
                  )}
                </div>
              </section>

              <section className="flex flex-col gap-3">
                <div className="rounded-xl border border-border/60 bg-card/40 overflow-hidden">
                  <div className="px-3 py-2 border-b border-border/60 flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      {(["python", "java"] as const).map((l) => (
                        <button
                          key={l}
                          onClick={() =>
                            setProblemEdits((prev) => ({
                              ...prev,
                              [activeProblemId]: {
                                language: l,
                                currentCode: prev[activeProblemId]?.currentCode ?? (l === "python" ? activeProblem?.starter.python ?? "" : activeProblem?.starter.java ?? ""),
                              },
                            }))
                          }
                          className={`px-3 py-1 rounded text-xs font-mono uppercase ${activeEdit?.language === l ? "bg-gradient-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
                        >
                          {l}
                        </button>
                      ))}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() =>
                          setProblemEdits((prev) => ({
                            ...prev,
                            [activeProblemId]: {
                              language: activeEdit?.language ?? "python",
                              currentCode:
                                (activeEdit?.language ?? "python") === "python"
                                  ? activeProblem?.starter.python ?? ""
                                  : activeProblem?.starter.java ?? "",
                            },
                          }))
                        }
                        className="inline-flex items-center gap-1 px-2 py-1 text-xs text-muted-foreground hover:text-foreground"
                      >
                        <RotateCcw className="h-3.5 w-3.5" /> reset
                      </button>
                      <button
                        onClick={() => void runCurrent()}
                        disabled={running || sessionData.session.status !== "in_progress"}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-gradient-primary text-primary-foreground text-xs font-bold disabled:opacity-60"
                      >
                        <Play className="h-3.5 w-3.5" /> {running ? "Running..." : "Run"}
                      </button>
                    </div>
                  </div>
                  <CodeEditor
                    value={activeEdit?.currentCode ?? ""}
                    language={activeEdit?.language ?? "python"}
                    onChange={(v) =>
                      setProblemEdits((prev) => ({
                        ...prev,
                        [activeProblemId]: {
                          language: prev[activeProblemId]?.language ?? "python",
                          currentCode: v,
                        },
                      }))
                    }
                  />
                  <div className="px-3 py-2 border-t border-border/60 text-[11px] text-muted-foreground">
                    {saving ? "Saving draft..." : "Draft is stored per problem while you switch."}
                  </div>
                </div>

                <div className="rounded-xl border border-border/60 bg-card/40 overflow-hidden">
                  <div className="px-3 py-2 border-b border-border/60 flex items-center justify-between">
                    <div className="text-xs font-mono uppercase tracking-widest text-muted-foreground">Run details</div>
                    {displayRun && (
                      <span className="text-xs font-mono text-muted-foreground">
                        Run #{displayRun.runNo} · {displaySampleSummary.passed}/{displaySampleSummary.total} sample tests
                      </span>
                    )}
                  </div>
                  <pre className="px-4 py-3 text-[12px] leading-6 font-mono max-h-36 overflow-auto" style={{ background: "var(--editor-bg)" }}>
                    {activeConsole.length ? activeConsole.join("\n") : "// Click Run to execute this problem test cases."}
                  </pre>
                  <div className="p-3 max-h-56 overflow-auto space-y-2">
                    {sampleCaseRows(displayRun).map((r, idx) => (
                      <div key={idx} className={`rounded border p-2 text-xs font-mono ${r.passed ? "border-neon-lime/40 bg-neon-lime/5" : "border-destructive/40 bg-destructive/5"}`}>
                        <div className="font-semibold mb-1">Sample {idx + 1} · {r.passed ? "Pass" : "Fail"}</div>
                        <div><span className="text-muted-foreground">in:</span> {r.stdinSnapshot}</div>
                        <div><span className="text-muted-foreground">expected:</span> {r.expectedOutputSnapshot}</div>
                        <div><span className="text-muted-foreground">got:</span> {r.stderr ? `ERROR · ${r.stderr}` : r.stdout || "(empty)"}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}


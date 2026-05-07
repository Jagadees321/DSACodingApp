import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { NavBar } from "@/components/NavBar";
import { apiGet, apiPost, useApi } from "@/lib/api";
import { BarChart3, ChevronDown, ChevronRight, Sparkles } from "lucide-react";
import { requireAdminBeforeLoad } from "@/lib/auth-guard";

export const Route = createFileRoute("/admin/dashboard")({
  beforeLoad: () => requireAdminBeforeLoad(),
  component: AdminDashboardPage,
});

type DashboardSummaryRow = {
  testId: string;
  title: string;
  durationMin: number;
  problemCount: number;
  status: string;
  updatedAt: string;
  assignmentCount: number;
  attemptCount: number;
  uniqueParticipants: number;
  submittedCount: number;
};

type ParticipantRow = {
  sessionId: string;
  assignmentId: string;
  attemptNo: number;
  sessionStatus: string;
  submittedAt: string | null;
  startedAt: string | null;
  userId: string;
  username: string;
  email: string;
  questionsAttempted: number;
  questionsInTest: number;
  totalRuns: number;
  totalTestCasesPassed: number;
  totalTestCasesExecuted: number;
  problemsFullySolvedCount: number;
};

type CoachReportModalState = {
  testId: string;
  sessionId: string;
  username: string;
  loading: boolean;
  report: Record<string, unknown> | null;
  error: string | null;
};

function CoachReportBody({ report }: { report: Record<string, unknown> }) {
  const scoreCard = report.scoreCard as Record<string, unknown> | undefined;
  const problems = Array.isArray(report.problemBreakdown) ? report.problemBreakdown : [];
  const strengths = Array.isArray(report.strengthAreas) ? report.strengthAreas : [];
  const weak = Array.isArray(report.weakAreas) ? report.weakAreas : [];
  const err = report.errorPatysis as Record<string, unknown> | undefined;
  const nextLvl = report.nextLevelReadiness as Record<string, unknown> | undefined;
  const fixes = Array.isArray(report.wrongAttemptCorrections) ? report.wrongAttemptCorrections : [];

  return (
    <div className="space-y-5 text-sm">
      {report.reportTitle != null && (
        <h3 className="text-lg font-bold text-foreground">{String(report.reportTitle)}</h3>
      )}
      {report.executiveSummary != null && (
        <p className="leading-relaxed text-muted-foreground">{String(report.executiveSummary)}</p>
      )}

      {scoreCard && (
        <div>
          <h4 className="text-xs font-mono uppercase tracking-widest text-neon-amber mb-2">Score card</h4>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs font-mono">
            {[
              ["Overall", scoreCard.overallScore],
              ["Accuracy", scoreCard.accuracyScore],
              ["Speed", scoreCard.speedScore],
              ["Efficiency", scoreCard.efficiencyScore],
              ["Consistency", scoreCard.consistencyScore],
            ].map((entry) => {
              const k = entry[0] as string;
              const v = entry[1];
              return (
              <div key={k} className="rounded border border-border/60 px-2 py-1.5 bg-muted/20">
                <div className="text-muted-foreground">{k}</div>
                <div className="text-foreground font-semibold">{String(v ?? "—")}</div>
              </div>
            );
            })}
          </div>
          {scoreCard.scoreExplanation != null && (
            <p className="mt-2 text-xs text-muted-foreground">{String(scoreCard.scoreExplanation)}</p>
          )}
        </div>
      )}

      {problems.length > 0 && (
        <div>
          <h4 className="text-xs font-mono uppercase tracking-widest text-neon-cyan mb-2">Problems</h4>
          <ul className="space-y-2">
            {problems.map((p, i) => {
              const row = p as Record<string, unknown>;
              return (
                <li key={i} className="rounded border border-border/60 p-3 bg-card/40">
                  <div className="font-medium">{String(row.problemTitle ?? "")}</div>
                  <div className="text-xs text-neon-lime mt-0.5">{String(row.verdict ?? "")}</div>
                  {row.insight != null && <p className="text-xs text-muted-foreground mt-1">{String(row.insight)}</p>}
                  {row.tip != null && <p className="text-xs mt-1"><span className="text-muted-foreground">Tip:</span> {String(row.tip)}</p>}
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {fixes.length > 0 && (
        <div>
          <h4 className="text-xs font-mono uppercase tracking-widest text-foreground mb-2">
            Wrong attempts → corrections
          </h4>
          <p className="text-[11px] text-muted-foreground mb-3">
            Per failed run: what broke, the submitted code at failure, the next run (if any), and the corrected excerpt.
          </p>
          <ul className="space-y-4">
            {fixes.map((raw, i) => {
              const row = raw as Record<string, unknown>;
              const lang = String(row.language ?? "text").toLowerCase();
              const fence = lang === "java" || lang === "python" ? lang : "text";
              const wrong = row.wrongCodeSnippet != null ? String(row.wrongCodeSnippet) : "";
              const right = row.correctedCodeSnippet != null ? String(row.correctedCodeSnippet) : "";
              return (
                <li
                  key={i}
                  className="rounded-xl border border-border/70 bg-muted/10 p-3 space-y-2 text-xs"
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <span className="font-semibold">{String(row.problemTitle ?? "")}</span>
                    <span className="font-mono text-[11px] text-muted-foreground">
                      Run #{String(row.failedRunNo ?? "?")}
                      {row.nextRunNo != null && Number(row.nextRunNo) > 0
                        ? ` → #${String(row.nextRunNo)}`
                        : ""}{" "}
                      ·{" "}
                      <span className="text-neon-amber">{String(row.outcomeAfterFix ?? "")}</span>
                    </span>
                  </div>
                  {row.whatWentWrong != null && (
                    <p className="text-muted-foreground leading-relaxed">{String(row.whatWentWrong)}</p>
                  )}
                  {wrong.length > 0 && (
                    <div>
                      <div className="text-[10px] uppercase tracking-wider text-destructive/90 mb-1">
                        Wrong attempt (snippet)
                      </div>
                      <pre
                        className="rounded-md border border-destructive/25 bg-destructive/5 p-2 overflow-x-auto text-[11px] leading-snug font-mono whitespace-pre-wrap"
                      >
                        <code className={`language-${fence}`}>{wrong}</code>
                      </pre>
                    </div>
                  )}
                  {row.howTheyFixedIt != null && String(row.howTheyFixedIt).length > 0 && (
                    <p className="text-muted-foreground border-l-2 border-neon-cyan/40 pl-2">
                      <span className="text-neon-cyan font-medium">Fix: </span>
                      {String(row.howTheyFixedIt)}
                    </p>
                  )}
                  {right.length > 0 && (
                    <div>
                      <div className="text-[10px] uppercase tracking-wider text-neon-lime/90 mb-1">
                        Next run / corrected (snippet)
                      </div>
                      <pre
                        className="rounded-md border border-neon-lime/30 bg-neon-lime/5 p-2 overflow-x-auto text-[11px] leading-snug font-mono whitespace-pre-wrap"
                      >
                        <code className={`language-${fence}`}>{right}</code>
                      </pre>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {strengths.length > 0 && (
        <div>
          <h4 className="text-xs font-mono uppercase tracking-widest text-neon-lime mb-2">Strengths</h4>
          <ul className="list-disc pl-4 space-y-1 text-xs">
            {strengths.map((s, i) => {
              const row = s as Record<string, unknown>;
              return (
                <li key={i}>
                  <span className="font-medium">{String(row.topic ?? "")}</span> — {String(row.evidence ?? "")}
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {weak.length > 0 && (
        <div>
          <h4 className="text-xs font-mono uppercase tracking-widest text-destructive/80 mb-2">Weak areas</h4>
          <ul className="space-y-2">
            {weak.map((w, i) => {
              const row = w as Record<string, unknown>;
              return (
                <li key={i} className="rounded border border-destructive/20 bg-destructive/5 p-2 text-xs">
                  <div className="font-medium">{String(row.topic ?? "")}</div>
                  <div className="text-muted-foreground mt-0.5">{String(row.evidence ?? "")}</div>
                  {row.howToFix != null && <div className="mt-1"><span className="text-muted-foreground">Fix:</span> {String(row.howToFix)}</div>}
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {err && (
        <div>
          <h4 className="text-xs font-mono uppercase tracking-widest mb-2">Error pattern</h4>
          <div className="rounded border border-border/60 p-3 text-xs space-y-1 font-mono bg-muted/15">
            <div><span className="text-muted-foreground">Most common:</span> {String(err.mostCommonError ?? "")}</div>
            {err.errorPattern != null && <div>{String(err.errorPattern)}</div>}
            {err.rootCause != null && <div>{String(err.rootCause)}</div>}
            {err.fix != null && <div className="text-neon-cyan">{String(err.fix)}</div>}
          </div>
        </div>
      )}

      {report.performanceVsLevel != null && (
        <p className="text-xs text-muted-foreground border-l-2 border-border pl-3">{String(report.performanceVsLevel)}</p>
      )}

      {nextLvl && (
        <div className="rounded border border-border/60 p-3 text-xs space-y-1">
          <div className="font-semibold">Next level readiness</div>
          <div>Ready: {String(nextLvl.readyForNextLevel ?? "")}</div>
          <div>Current: {String(nextLvl.currentLevel ?? "")} → Next: {String(nextLvl.nextLevel ?? "")}</div>
          {Array.isArray(nextLvl.missingSkills) && (nextLvl.missingSkills as unknown[]).length > 0 && (
            <div>Missing: {(nextLvl.missingSkills as unknown[]).map(String).join(", ")}</div>
          )}
          {nextLvl.estimatedDaysToReady != null && (
            <div>Est. days: {String(nextLvl.estimatedDaysToReady)}</div>
          )}
        </div>
      )}

      {report.motivationalMessage != null && (
        <p className="text-sm font-medium text-neon-amber border-t border-border/60 pt-3">{String(report.motivationalMessage)}</p>
      )}

      <details className="text-xs">
        <summary className="cursor-pointer text-muted-foreground hover:text-foreground">Raw JSON</summary>
        <pre className="mt-2 p-3 rounded bg-muted/30 overflow-auto max-h-48 font-mono text-[11px]">
          {JSON.stringify(report, null, 2)}
        </pre>
      </details>
    </div>
  );
}

function AdminDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<DashboardSummaryRow[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [detailLoading, setDetailLoading] = useState<string | null>(null);
  const [detailErrors, setDetailErrors] = useState<Record<string, string>>({});
  const [participantsByTest, setParticipantsByTest] = useState<
    Record<string, { participants: ParticipantRow[]; title?: string }>
  >({});
  const [reportModal, setReportModal] = useState<CoachReportModalState | null>(null);

  useEffect(() => {
    const load = async () => {
      if (!useApi) {
        setError("Enable VITE_USE_API=true and sign in as admin to load reports.");
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        const data = await apiGet<DashboardSummaryRow[]>("/tests/admin/dashboard-summary");
        setRows(Array.isArray(data) ? data : []);
        setError(null);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Could not load dashboard.");
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  const toggleExpand = async (testId: string) => {
    if (expanded === testId) {
      setExpanded(null);
      return;
    }
    setExpanded(testId);
    if (participantsByTest[testId]?.participants?.length) return;
    setDetailLoading(testId);
    setDetailErrors((prev) => {
      const next = { ...prev };
      delete next[testId];
      return next;
    });
    try {
      const res = await apiGet<{
        test: { _id: string; title: string };
        participants: ParticipantRow[];
      }>(`/tests/${testId}/admin/participants`);
      setParticipantsByTest((prev) => ({
        ...prev,
        [testId]: {
          title: res.test.title,
          participants: res.participants ?? [],
        },
      }));
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Could not load participants.";
      setDetailErrors((prev) => ({ ...prev, [testId]: msg }));
    } finally {
      setDetailLoading(null);
    }
  };

  const fetchAiReport = async (testId: string, sessionId: string, username: string) => {
    setReportModal({ testId, sessionId, username, loading: true, report: null, error: null });
    try {
      const report = await apiPost<Record<string, unknown>>(
        `/tests/${testId}/admin/sessions/${sessionId}/ai-report`,
        {},
      );
      setReportModal((m) => (m ? { ...m, loading: false, report } : null));
    } catch (e: unknown) {
      setReportModal((m) =>
        m
          ? {
              ...m,
              loading: false,
              error: e instanceof Error ? e.message : String(e),
            }
          : null,
      );
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <NavBar />
      <main className="flex-1 mx-auto w-full max-w-[1400px] px-3 md:px-6 py-6 md:py-8 relative">
        {reportModal && (
          <div className="fixed inset-0 z-[60] flex items-start justify-center p-4 sm:p-8 overflow-y-auto">
            <button
              type="button"
              aria-label="Close report"
              className="fixed inset-0 bg-black/55 backdrop-blur-[2px]"
              disabled={reportModal.loading}
              onClick={() => !reportModal.loading && setReportModal(null)}
            />
            <div className="relative z-[61] w-full max-w-2xl rounded-2xl border border-border/80 bg-card shadow-xl mt-4 mb-12 max-h-[85vh] flex flex-col overflow-hidden">
              <div className="flex items-start justify-between gap-3 px-4 py-3 border-b border-border/60 bg-muted/20">
                <div className="min-w-0">
                  <div className="text-xs font-mono uppercase tracking-widest text-muted-foreground">AI report</div>
                  <h2 className="font-semibold truncate">{reportModal.username}</h2>
                </div>
                <button
                  type="button"
                  disabled={reportModal.loading}
                  onClick={() => setReportModal(null)}
                  className="shrink-0 text-xs px-2 py-1 rounded border border-border hover:bg-muted disabled:opacity-50"
                >
                  Close
                </button>
              </div>
              <div className="flex-1 overflow-auto px-4 py-4">
                {reportModal.loading && (
                  <p className="text-sm text-muted-foreground flex items-center gap-2">
                    <Sparkles className="h-4 w-4 animate-pulse text-neon-amber" />
                    Generating report with Gemini…
                  </p>
                )}
                {reportModal.error && (
                  <p className="text-sm text-destructive">{reportModal.error}</p>
                )}
                {reportModal.report && <CoachReportBody report={reportModal.report} />}
              </div>
            </div>
          </div>
        )}

        <div className="mb-6">
          <div className="inline-flex items-center gap-2 text-neon-amber">
            <BarChart3 className="h-5 w-5" />
            <span className="text-xs font-mono uppercase tracking-widest">Reports</span>
          </div>
          <h1 className="mt-1 text-3xl md:text-4xl font-extrabold">Admin Dashboard</h1>
          <p className="mt-2 text-sm text-muted-foreground max-w-2xl">
            View each coding test, who attempted it, and aggregate results (questions touched, runs,
            test-case pass totals). Admin-only — enforced on the API.
          </p>
        </div>

        {error && (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive mb-4">
            {error}
          </div>
        )}

        {loading ? (
          <div className="rounded-xl border border-border/60 bg-card/40 p-8 text-sm text-muted-foreground">
            Loading reports…
          </div>
        ) : rows.length === 0 ? (
          <div className="rounded-xl border border-border/60 bg-card/40 p-8 text-sm text-muted-foreground">
            No tests yet. Create and assign tests from{" "}
            <Link to="/tests/assign" className="text-neon-cyan hover:underline">
              DSA Test Assign
            </Link>
            .
          </div>
        ) : (
          <div className="space-y-3">
            {rows.map((row) => (
              <div key={row.testId} className="rounded-xl border border-border/60 bg-card/40 overflow-hidden">
                <button
                  type="button"
                  onClick={() => void toggleExpand(row.testId)}
                  className="w-full flex flex-wrap items-center justify-between gap-3 px-4 py-4 text-left hover:bg-muted/30 transition-smooth"
                >
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold truncate">{row.title}</div>
                    <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground font-mono">
                      <span>{row.problemCount} questions</span>
                      <span>{row.durationMin} min</span>
                      <span>{row.status}</span>
                      <span>{row.uniqueParticipants} learners</span>
                      <span>{row.attemptCount} attempts</span>
                      <span>{row.submittedCount} submitted</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs text-muted-foreground hidden sm:inline">
                      {row.assignmentCount} assignment(s)
                    </span>
                    {expanded === row.testId ? (
                      <ChevronDown className="h-5 w-5 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>
                </button>

                {expanded === row.testId && (
                  <div className="border-t border-border/60 px-2 pb-4 pt-2 overflow-x-auto">
                    {detailLoading === row.testId && (
                      <p className="px-2 py-3 text-sm text-muted-foreground">Loading participant rows…</p>
                    )}
                    {detailErrors[row.testId] && expanded === row.testId && (
                      <p className="px-2 py-2 text-sm text-destructive">{detailErrors[row.testId]}</p>
                    )}
                    {!detailLoading && participantsByTest[row.testId] && (
                      <table className="w-full min-w-[880px] text-sm">
                        <thead>
                          <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground border-b border-border/60">
                            <th className="py-2 px-2 font-medium">Learner</th>
                            <th className="py-2 px-2 font-medium">Attempt</th>
                            <th className="py-2 px-2 font-medium">Status</th>
                            <th className="py-2 px-2 font-medium">Questions tried</th>
                            <th className="py-2 px-2 font-medium">Runs</th>
                            <th className="py-2 px-2 font-medium">Cases OK / run</th>
                            <th className="py-2 px-2 font-medium">Fully solved #</th>
                            <th className="py-2 px-2 font-medium whitespace-nowrap">AI report</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(participantsByTest[row.testId].participants ?? []).map((p) => (
                            <tr key={p.sessionId} className="border-b border-border/40 hover:bg-muted/20">
                              <td className="py-2.5 px-2">
                                <div className="font-medium">{p.username}</div>
                                <div className="text-xs text-muted-foreground truncate max-w-[200px]">{p.email}</div>
                              </td>
                              <td className="py-2.5 px-2 font-mono text-xs">#{p.attemptNo}</td>
                              <td className="py-2.5 px-2 text-xs">{p.sessionStatus}</td>
                              <td className="py-2.5 px-2 font-mono">
                                {p.questionsAttempted}/{p.questionsInTest}
                              </td>
                              <td className="py-2.5 px-2 font-mono">{p.totalRuns}</td>
                              <td className="py-2.5 px-2 font-mono">
                                {p.totalTestCasesPassed}/{p.totalTestCasesExecuted}
                              </td>
                              <td className="py-2.5 px-2 font-mono">{p.problemsFullySolvedCount}</td>
                              <td className="py-2.5 px-2">
                                <button
                                  type="button"
                                  onClick={() => void fetchAiReport(row.testId, p.sessionId, p.username)}
                                  className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-muted/80 hover:bg-muted text-xs font-medium border border-border/60"
                                >
                                  <Sparkles className="h-3.5 w-3.5 text-neon-amber shrink-0" />
                                  Report
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                    {!detailLoading &&
                      participantsByTest[row.testId] &&
                      (participantsByTest[row.testId].participants?.length ?? 0) === 0 && (
                        <p className="px-2 py-3 text-sm text-muted-foreground">No attempts yet for this test.</p>
                      )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

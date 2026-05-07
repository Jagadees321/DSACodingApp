import { Types } from "mongoose";
import { AssignedTestRunEventModel } from "../models/assigned-test-run-event.model.js";
import { AssignedTestSessionModel } from "../models/assigned-test-session.model.js";
import { ProblemModel } from "../models/problem.model.js";
import { TestModel } from "../models/test.model.js";
import { UserModel } from "../models/user.model.js";
import { HttpError } from "./http-error.js";

function trimSnippet(s: string, max = 140): string {
  const t = s.replace(/\r\n/g, "\n").trim();
  return t.length <= max ? t : `${t.slice(0, max)}…`;
}

function summarizeLineChanges(prev: string, next: string): string {
  if (prev === next) return "no_code_change";
  const pa = prev.replace(/\r\n/g, "\n").split("\n");
  const pb = next.replace(/\r\n/g, "\n").split("\n");
  const hints: string[] = [];
  const maxLines = Math.max(pa.length, pb.length);
  for (let i = 0; i < maxLines && hints.length < 10; i += 1) {
    const la = pa[i] ?? "";
    const lb = pb[i] ?? "";
    if (la !== lb) {
      hints.push(`L${i + 1}: "${trimSnippet(la, 120)}" → "${trimSnippet(lb, 120)}"`);
    }
  }
  if (hints.length === 0) return "edit_without_first_80_lines_changed (sizes differ)";
  return hints.join(" | ");
}

const MAX_RUNS_PER_PROBLEM = 40;

/** Keep payloads bounded but large enough for Gemini to quote real fixes vs bugs. */
const MAX_SOURCE_EXCERPT_CHARS = 5200;

function excerptSource(code: string | undefined): string {
  if (!code) return "";
  const n = code.replace(/\r\n/g, "\n");
  if (n.length <= MAX_SOURCE_EXCERPT_CHARS) return n;
  const head = 2400;
  const tail = 2200;
  return `${n.slice(0, head)}\n\n/* … ${n.length - head - tail} characters omitted … */\n\n${n.slice(-tail)}`;
}

type FollowUpFailure = {
  problemTitle: string;
  problemCategory: string;
  problemId: string;
  language: "java" | "python" | string;
  failedRunNo: number;
  submittedAtFailed: Date | null;
  judgeStatusOnFailure: string;
  /** First stopping failure from judge (stdout/stderr/expected). */
  failureOnStoppingCase: {
    kindGuess: string;
    stdinPreview: string;
    expectedPreview: string;
    stderrSnippet: string;
    stdoutSnippet: string;
  } | null;
  /** Submitted code for the failed run (excerpt). */
  wrongCodeExcerpt: string;
  /** Run that came after the failure (null if learner never ran again on this problem). */
  followingRunNo: number | null;
  followingJudgeStatus: string | null;
  followingSubmittedAt: Date | null;
  /** Code for the following run when present (excerpt). */
  followingCodeExcerpt: string | null;
  /** Line-level diff summary vs wrongCodeExcerpt → followingCodeExcerpt. */
  programmaticDiffSummary: string;
};

function failurePreviewForRun(run: {
  status: string;
  testCaseResults?: { passed: boolean; stdinSnapshot?: string; expectedOutputSnapshot?: string; stderr?: string; stdout?: string }[];
  errorMessage?: string;
  compilerOutput?: string;
}): FollowUpFailure["failureOnStoppingCase"] {
  if (run.status === "accepted") return null;
  const firstFail = (run.testCaseResults ?? []).find((tc) => !tc.passed);
  if (firstFail) {
    return {
      kindGuess:
        run.status === "compile_error"
          ? "COMPILE_ERROR"
          : run.status === "runtime_error"
            ? "RUNTIME_ERROR"
            : "WRONG_ANSWER_OR_ASSERTION",
      stdinPreview: trimSnippet(firstFail.stdinSnapshot ?? "", 320),
      expectedPreview: trimSnippet(firstFail.expectedOutputSnapshot ?? "", 320),
      stderrSnippet: trimSnippet(firstFail.stderr ?? "", 1200),
      stdoutSnippet: trimSnippet(firstFail.stdout ?? "", 400),
    };
  }
  const errBlob = [run.errorMessage, run.compilerOutput].filter(Boolean).join("\n");
  if (!errBlob.trim()) return null;
  return {
    kindGuess:
      run.status === "compile_error"
        ? "COMPILE_ERROR"
        : run.status === "runtime_error"
          ? "RUNTIME_ERROR"
          : "FAILED_OR_JUDGE_STOP",
    stdinPreview: "",
    expectedPreview: "",
    stderrSnippet: trimSnippet(errBlob, 1200),
    stdoutSnippet: "",
  };
}

function buildFollowUpsForProblem(
  title: string,
  category: string,
  pid: string,
  ordered: {
    runNo: number;
    submittedAt?: Date;
    language: string;
    status: string;
    sourceCode: string;
    testCaseResults?: { passed: boolean; stdinSnapshot?: string; expectedOutputSnapshot?: string; stderr?: string; stdout?: string }[];
    errorMessage?: string;
    compilerOutput?: string;
  }[],
): FollowUpFailure[] {
  const out: FollowUpFailure[] = [];
  for (let i = 0; i < ordered.length; i += 1) {
    const run = ordered[i];
    if (run.status === "accepted") continue;
    const next = ordered[i + 1];
    const failureOnStoppingCase = failurePreviewForRun(run);

    const wrongCodeExcerpt = excerptSource(run.sourceCode);
    const followingCodeExcerpt = next ? excerptSource(next.sourceCode) : null;
    const programmaticDiffSummary = next
      ? summarizeLineChanges(run.sourceCode, next.sourceCode)
      : "no_later_run_on_this_problem";

    out.push({
      problemTitle: title,
      problemCategory: category,
      problemId: pid,
      language: run.language,
      failedRunNo: run.runNo,
      submittedAtFailed: run.submittedAt ?? null,
      judgeStatusOnFailure: run.status,
      failureOnStoppingCase,
      wrongCodeExcerpt,
      followingRunNo: next?.runNo ?? null,
      followingJudgeStatus: next?.status ?? null,
      followingSubmittedAt: next?.submittedAt ?? null,
      followingCodeExcerpt,
      programmaticDiffSummary,
    });
  }
  return out;
}

export async function buildCoachReportUserData(params: {
  sessionId: string;
  testId: string;
}): Promise<Record<string, unknown>> {
  const sessionOid = new Types.ObjectId(params.sessionId);
  const testOid = new Types.ObjectId(params.testId);

  const session = await AssignedTestSessionModel.findById(sessionOid).lean();
  if (!session) throw new HttpError(404, "NOT_FOUND", "Session not found");
  if (String(session.testId) !== params.testId) {
    throw new HttpError(404, "NOT_FOUND", "Session does not belong to this test");
  }

  const test = await TestModel.findById(testOid).lean();
  if (!test) throw new HttpError(404, "NOT_FOUND", "Test not found");

  const user = await UserModel.findById(session.userId).select("username email").lean();

  const runs = await AssignedTestRunEventModel.find({ sessionId: session._id })
    .sort({ submittedAt: 1 })
    .lean();

  const problemDocs = await ProblemModel.find({ _id: { $in: test.problemIds } }).lean();
  const problemById = new Map(problemDocs.map((p) => [String(p._id), p]));

  const runsByProblem = new Map<string, typeof runs>();
  for (const r of runs) {
    const pid = String(r.problemId);
    if (!runsByProblem.has(pid)) runsByProblem.set(pid, []);
    runsByProblem.get(pid)!.push(r);
  }

  const agg = session.aggregate ?? {};
  const distinctProblemsWithRuns = runsByProblem.size;

  const attemptFailuresAndFollowUps: FollowUpFailure[] = [];

  const problemsPayload = (test.problemIds ?? []).map((problemOid, idx: number) => {
    const pid = String(problemOid);
    const prob = problemById.get(pid);
    let ordered = (runsByProblem.get(pid) ?? []).slice().sort((a, b) => a.runNo - b.runNo);
    if (ordered.length > MAX_RUNS_PER_PROBLEM) {
      ordered = ordered.slice(-MAX_RUNS_PER_PROBLEM);
    }

    attemptFailuresAndFollowUps.push(
      ...buildFollowUpsForProblem(prob?.title ?? "Unknown", prob?.category ?? "", pid, ordered),
    );

    const runSnapshots = ordered.map((run, runIdx: number) => {
      const prevRun = runIdx > 0 ? ordered[runIdx - 1] : undefined;
      let correctionComparedToPrevious: string | null = null;
      if (prevRun) {
        if (prevRun.sourceCode !== run.sourceCode) {
          correctionComparedToPrevious = summarizeLineChanges(prevRun.sourceCode, run.sourceCode);
        } else {
          correctionComparedToPrevious = "same_source_as_previous_run";
        }
      }

      const firstFail = (run.testCaseResults ?? []).find((tc) => !tc.passed);
      const failBrief =
        firstFail && run.status !== "accepted"
          ? {
              kindGuess:
                run.status === "compile_error"
                  ? "COMPILE_ERROR"
                  : run.status === "runtime_error"
                    ? "RUNTIME_ERROR"
                    : "WRONG_ANSWER_OR_ASSERTION",
              stdinPreview: trimSnippet(firstFail.stdinSnapshot ?? "", 240),
              expectedPreview: trimSnippet(firstFail.expectedOutputSnapshot ?? "", 240),
              stderrSnippet: trimSnippet(firstFail.stderr ?? "", 800),
              stdoutSnippet: trimSnippet(firstFail.stdout ?? "", 320),
            }
          : null;

      return {
        runNo: run.runNo,
        submittedAt: run.submittedAt,
        language: run.language,
        judgeStatus: run.status,
        testCasesPassed: run.testCasesPassed,
        testCasesTotal: run.testCasesTotal,
        comparedToPreviousRun: correctionComparedToPrevious,
        failurePreviewOnStoppingCase: failBrief,
        sourceChars: run.sourceCode?.length ?? 0,
        /** Full excerpt for report copy/paste analysis (bounded). */
        sourceCodeExcerpt: excerptSource(run.sourceCode),
      };
    });

    const anyAccepted = ordered.some((r) => r.status === "accepted");

    return {
      orderIndex: idx + 1,
      problemId: pid,
      title: prob?.title ?? "Unknown",
      category: prob?.category ?? "",
      level: prob?.level ?? null,
      runsAttempted: ordered.length,
      fullyAcceptedAllHiddenCases: anyAccepted,
      runsChronological: runSnapshots,
    };
  });

  return {
    platform: "RoyalsDSA",
    test: {
      title: test.title,
      durationMin: test.durationMin,
      problemCount: test.problemIds?.length ?? 0,
    },
    learner: {
      username: user?.username ?? "?",
      email: user?.email ?? "",
      userId: String(session.userId),
    },
    session: {
      sessionId: String(session._id),
      attemptNo: session.attemptNo,
      status: session.status,
      startedAt: session.startedAt ?? null,
      submittedAt: session.submittedAt ?? null,
      expiresAt: session.expiresAt ?? null,
    },
    aggregatesFromSession: {
      distinctProblemsWithAtLeastOneRun: distinctProblemsWithRuns,
      totalRunsAcrossProblems: agg.totalRuns ?? 0,
      totalTestCasesPassedAcrossRuns: agg.totalPassedCases ?? 0,
      totalTestCasesExecutedAcrossRuns: agg.totalCasesExecuted ?? 0,
      problemsMarkedFullySolvedByJudge: agg.problemsCompleted ?? 0,
    },
    /** Each non-accepting run: wrong excerpt + optional next run excerpt & diff (primary evidence for mistake→fix narrative). */
    attemptFailuresAndFollowUps,
    problems: problemsPayload,
    meta: {
      runsIncludedTotal: runs.length,
      note:
        "Compared-to-previous summarizes line-level edits between consecutive runs per problem. Hidden tests may stop early before later runs. attemptFailuresAndFollowUps pairs each failed run with the next run on the same problem; use wrongCodeExcerpt and followingCodeExcerpt verbatim in the report.",
    },
  };
}

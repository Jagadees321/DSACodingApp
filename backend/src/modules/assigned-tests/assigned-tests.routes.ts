import { Router } from "express";
import { z } from "zod";
import { Types } from "mongoose";
import { requireAuth } from "../../middleware/auth.js";
import { HttpError } from "../../lib/http-error.js";
import { runInDockerSandbox } from "../../judge/docker-runner.js";
import { AssignedTestRunEventModel } from "../../models/assigned-test-run-event.model.js";
import { AssignedTestSessionModel } from "../../models/assigned-test-session.model.js";
import { GroupMembershipModel } from "../../models/group-membership.model.js";
import { ProblemModel } from "../../models/problem.model.js";
import { TestAssignmentModel } from "../../models/test-assignment.model.js";
import { TestCaseModel } from "../../models/test-case.model.js";
import { TestModel } from "../../models/test.model.js";

export const assignedTestsRouter = Router();

const objectId = z.string().regex(/^[a-fA-F0-9]{24}$/, "Invalid id");

function isSessionFinal(status: string) {
  return status === "submitted" || status === "auto_submitted" || status === "expired";
}

function deriveAssignmentStatus(input: {
  status: "scheduled" | "active" | "closed" | "cancelled";
  startAt: Date;
  dueAt: Date;
  now: Date;
}) {
  if (input.status === "cancelled") return "cancelled" as const;
  if (input.now < input.startAt) return "scheduled" as const;
  if (input.now > input.dueAt) return "closed" as const;
  return "active" as const;
}

async function resolveAccessibleAssignment(assignmentId: string, userId: string) {
  const assignmentDoc = await TestAssignmentModel.findById(assignmentId);
  const assignment = assignmentDoc?.toObject();
  if (!assignment || assignment.status === "cancelled") {
    throw new HttpError(404, "NOT_FOUND", "Assignment not found");
  }
  const statusNow = deriveAssignmentStatus({
    status: assignment.status,
    startAt: assignment.startAt,
    dueAt: assignment.dueAt,
    now: new Date(),
  });
  if (assignmentDoc && assignmentDoc.status !== statusNow) {
    assignmentDoc.status = statusNow;
    await assignmentDoc.save();
    assignment.status = statusNow;
  }

  const direct = (assignment.targetUsers ?? []).some((id) => String(id) === userId);
  let viaGroup = false;
  if (!direct && (assignment.targetGroups ?? []).length > 0) {
    viaGroup = Boolean(
      await GroupMembershipModel.findOne({
        userId: new Types.ObjectId(userId),
        groupId: { $in: assignment.targetGroups },
        isActive: true,
      }).lean(),
    );
  }

  if (!direct && !viaGroup) throw new HttpError(403, "FORBIDDEN", "Assignment not available");
  return assignment;
}

assignedTestsRouter.get("/assigned/me", requireAuth, async (req, res) => {
  const userId = req.user!.userId;
  const memberships = await GroupMembershipModel.find({ userId: new Types.ObjectId(userId), isActive: true })
    .select("groupId")
    .lean();
  const groupIds = memberships.map((m) => m.groupId);

  const now = new Date();
  const assignments = await TestAssignmentModel.find({
    status: { $in: ["scheduled", "active"] },
    $or: [{ targetUsers: new Types.ObjectId(userId) }, { targetGroups: { $in: groupIds } }],
  })
    .sort({ createdAt: -1 })
    .lean();

  const testIds = [...new Set(assignments.map((a) => String(a.testId)))].map((id) => new Types.ObjectId(id));
  const tests = testIds.length ? await TestModel.find({ _id: { $in: testIds } }).lean() : [];
  const testsById = new Map(tests.map((t) => [String(t._id), t]));

  const sessions = await AssignedTestSessionModel.find({
    assignmentId: { $in: assignments.map((a) => a._id) },
    userId: new Types.ObjectId(userId),
  })
    .sort({ attemptNo: -1 })
    .lean();

  const latestByAssignment = new Map<string, (typeof sessions)[number]>();
  for (const session of sessions) {
    const key = String(session.assignmentId);
    if (!latestByAssignment.has(key)) latestByAssignment.set(key, session);
  }

  res.json({
    ok: true,
    data: assignments.map((a) => ({
      ...a,
      test: testsById.get(String(a.testId)) ?? null,
      latestSession: latestByAssignment.get(String(a._id)) ?? null,
      effectiveStatus: deriveAssignmentStatus({
        status: a.status,
        startAt: a.startAt,
        dueAt: a.dueAt,
        now,
      }),
      isAvailable: a.startAt <= now && (a.allowLate || a.dueAt >= now) && a.status !== "cancelled",
    })),
  });
});

assignedTestsRouter.post("/:assignmentId/start", requireAuth, async (req, res) => {
  const assignmentId = objectId.parse(req.params.assignmentId);
  const userId = req.user!.userId;
  const assignment = await resolveAccessibleAssignment(assignmentId, userId);
  const test = await TestModel.findById(assignment.testId).lean();
  if (!test) throw new HttpError(404, "NOT_FOUND", "Test not found");

  const now = new Date();
  if (assignment.startAt > now) {
    throw new HttpError(400, "ASSIGNMENT_NOT_STARTED", "Assignment has not started yet");
  }
  if (!assignment.allowLate && assignment.dueAt < now) {
    throw new HttpError(400, "ASSIGNMENT_EXPIRED", "Assignment has expired");
  }

  const existingInProgress = await AssignedTestSessionModel.findOne({
    assignmentId: assignment._id,
    userId: new Types.ObjectId(userId),
    status: { $in: ["not_started", "in_progress"] },
  })
    .sort({ attemptNo: -1 })
    .lean();
  if (existingInProgress) {
    res.json({ ok: true, data: existingInProgress });
    return;
  }

  const existingCount = await AssignedTestSessionModel.countDocuments({
    assignmentId: assignment._id,
    userId: new Types.ObjectId(userId),
  });
  const attemptNo = existingCount + 1;
  if (attemptNo > assignment.maxAttemptsPerUser) {
    throw new HttpError(400, "ATTEMPT_LIMIT_REACHED", "Maximum attempts reached");
  }

  const problems = await ProblemModel.find({ _id: { $in: test.problemIds } }).lean();
  const byId = new Map(problems.map((p) => [String(p._id), p]));
  const problemStates = test.problemIds.map((problemId) => {
    const p = byId.get(String(problemId));
    return {
      problemId,
      language: "python" as const,
      currentCode: p?.starter?.python ?? "",
      openedAt: now,
      isSubmitted: false,
    };
  });

  const session = await AssignedTestSessionModel.create({
    assignmentId: assignment._id,
    testId: test._id,
    userId: new Types.ObjectId(userId),
    attemptNo,
    status: "in_progress",
    startedAt: now,
    expiresAt: assignment.dueAt,
    lastActivityAt: now,
    problemStates,
  });

  res.status(201).json({ ok: true, data: session });
});

assignedTestsRouter.get("/session/:sessionId", requireAuth, async (req, res) => {
  const sessionId = objectId.parse(req.params.sessionId);
  const session = await AssignedTestSessionModel.findById(sessionId).lean();
  if (!session) throw new HttpError(404, "NOT_FOUND", "Session not found");
  if (String(session.userId) !== req.user!.userId && req.user!.role !== "admin") {
    throw new HttpError(403, "FORBIDDEN", "Not allowed");
  }

  const assignment = await TestAssignmentModel.findById(session.assignmentId).lean();
  const test = await TestModel.findById(session.testId).lean();
  const problemIds = session.problemStates.map((p) => p.problemId);
  const problems = await ProblemModel.find({ _id: { $in: problemIds } }).lean();

  res.json({ ok: true, data: { session, assignment, test, problems } });
});

const saveCodeSchema = z.object({
  language: z.enum(["java", "python"]),
  currentCode: z.string().min(1).max(100_000),
});

assignedTestsRouter.put("/session/:sessionId/problems/:problemId/code", requireAuth, async (req, res) => {
  const sessionId = objectId.parse(req.params.sessionId);
  const problemId = objectId.parse(req.params.problemId);
  const body = saveCodeSchema.parse(req.body);

  const session = await AssignedTestSessionModel.findById(sessionId);
  if (!session) throw new HttpError(404, "NOT_FOUND", "Session not found");
  if (String(session.userId) !== req.user!.userId) throw new HttpError(403, "FORBIDDEN", "Not allowed");
  if (session.expiresAt && new Date() > session.expiresAt) {
    session.status = "expired";
    session.lastActivityAt = new Date();
    await session.save();
    throw new HttpError(400, "SESSION_EXPIRED", "Session has expired");
  }
  if (isSessionFinal(session.status)) throw new HttpError(400, "SESSION_CLOSED", "Session already closed");

  const state = session.problemStates.find((p) => String(p.problemId) === problemId);
  if (!state) throw new HttpError(404, "NOT_FOUND", "Problem not part of this session");

  state.language = body.language;
  state.currentCode = body.currentCode;
  state.openedAt = new Date();
  session.lastActivityAt = new Date();
  await session.save();
  res.json({ ok: true, data: { saved: true } });
});

const runSchema = z.object({
  language: z.enum(["java", "python"]),
  sourceCode: z.string().min(1).max(100_000),
});

assignedTestsRouter.post("/session/:sessionId/problems/:problemId/run", requireAuth, async (req, res) => {
  const sessionId = objectId.parse(req.params.sessionId);
  const problemId = objectId.parse(req.params.problemId);
  const body = runSchema.parse(req.body);

  const session = await AssignedTestSessionModel.findById(sessionId);
  if (!session) throw new HttpError(404, "NOT_FOUND", "Session not found");
  if (String(session.userId) !== req.user!.userId) throw new HttpError(403, "FORBIDDEN", "Not allowed");
  if (session.expiresAt && new Date() > session.expiresAt) {
    session.status = "expired";
    session.lastActivityAt = new Date();
    await session.save();
    throw new HttpError(400, "SESSION_EXPIRED", "Session has expired");
  }
  if (isSessionFinal(session.status)) throw new HttpError(400, "SESSION_CLOSED", "Session already closed");

  const state = session.problemStates.find((p) => String(p.problemId) === problemId);
  if (!state) throw new HttpError(404, "NOT_FOUND", "Problem not part of this session");

  const testCases = await TestCaseModel.find({ problemId: new Types.ObjectId(problemId) }).sort({ orderIndex: 1 });
  let passed = 0;
  const results: {
    testCaseId: Types.ObjectId;
    isHidden: boolean;
    stdinSnapshot: string;
    expectedOutputSnapshot: string;
    passed: boolean;
    stdout: string;
    stderr: string;
    executionTimeMs: number;
    memoryKb: number;
  }[] = [];
  let finalStatus: "accepted" | "failed" | "runtime_error" | "compile_error" = "accepted";

  for (const test of testCases) {
    const run = await runInDockerSandbox({
      language: body.language,
      sourceCode: body.sourceCode,
      stdin: test.stdin,
      expectedOutput: test.expectedOutput,
    });
    const ok = run.status === "accepted";
    if (ok) passed += 1;
    else finalStatus = run.status;

    results.push({
      testCaseId: test._id,
      isHidden: Boolean(test.isHidden),
      stdinSnapshot: test.stdin,
      expectedOutputSnapshot: test.expectedOutput,
      passed: ok,
      stdout: run.stdout,
      stderr: run.stderr,
      executionTimeMs: run.executionTimeMs,
      memoryKb: run.memoryKb,
    });

    if (!ok) break;
  }

  const testCasesTotal = testCases.length;
  if (passed === testCasesTotal) finalStatus = "accepted";

  const runNo =
    (await AssignedTestRunEventModel.countDocuments({
      sessionId: session._id,
      problemId: new Types.ObjectId(problemId),
    })) + 1;

  const event = await AssignedTestRunEventModel.create({
    sessionId: session._id,
    assignmentId: session.assignmentId,
    testId: session.testId,
    userId: session.userId,
    problemId: new Types.ObjectId(problemId),
    sourceCode: body.sourceCode,
    language: body.language,
    runNo,
    status: finalStatus,
    testCasesPassed: passed,
    testCasesTotal,
    testCaseResults: results,
    errorMessage: finalStatus === "accepted" ? "" : results.find((r) => !r.passed)?.stderr ?? "",
    submittedAt: new Date(),
  });

  state.language = body.language;
  state.currentCode = body.sourceCode;
  state.lastRunAt = new Date();
  session.lastActivityAt = new Date();
  session.aggregate.totalRuns += 1;
  session.aggregate.totalPassedCases += passed;
  session.aggregate.totalCasesExecuted += testCasesTotal;
  if (finalStatus === "accepted") session.aggregate.problemsCompleted += 1;
  await session.save();

  res.status(201).json({ ok: true, data: event });
});

const submitSessionSchema = z.object({
  /** `auto_leave` = user left the test (tab, in-app nav, or closed page); always stored as auto_submitted if still in window. */
  source: z.enum(["manual", "auto_leave"]).optional().default("manual"),
});

assignedTestsRouter.post("/session/:sessionId/submit", requireAuth, async (req, res) => {
  const sessionId = objectId.parse(req.params.sessionId);
  const body = submitSessionSchema.parse(req.body ?? {});
  const session = await AssignedTestSessionModel.findById(sessionId);
  if (!session) throw new HttpError(404, "NOT_FOUND", "Session not found");
  if (String(session.userId) !== req.user!.userId) throw new HttpError(403, "FORBIDDEN", "Not allowed");
  if (isSessionFinal(session.status)) {
    res.json({ ok: true, data: session });
    return;
  }

  const now = new Date();
  const pastDue = session.expiresAt && now > new Date(session.expiresAt);
  if (pastDue) {
    session.status = "auto_submitted";
  } else if (body.source === "auto_leave") {
    session.status = "auto_submitted";
  } else {
    session.status = "submitted";
  }
  session.submittedAt = now;
  session.lastActivityAt = now;
  session.problemStates.forEach((state) => {
    state.finalCode = state.currentCode;
    state.isSubmitted = true;
  });
  await session.save();

  res.json({ ok: true, data: session });
});

assignedTestsRouter.get("/session/:sessionId/problems/:problemId/runs", requireAuth, async (req, res) => {
  const sessionId = objectId.parse(req.params.sessionId);
  const problemId = objectId.parse(req.params.problemId);
  const session = await AssignedTestSessionModel.findById(sessionId).lean();
  if (!session) throw new HttpError(404, "NOT_FOUND", "Session not found");
  if (String(session.userId) !== req.user!.userId && req.user!.role !== "admin") {
    throw new HttpError(403, "FORBIDDEN", "Not allowed");
  }

  const runs = await AssignedTestRunEventModel.find({
    sessionId: new Types.ObjectId(sessionId),
    problemId: new Types.ObjectId(problemId),
  })
    .sort({ runNo: 1 })
    .lean();

  const testCaseIds = new Set<string>();
  for (const run of runs) {
    for (const row of run.testCaseResults ?? []) {
      if (row.testCaseId) testCaseIds.add(String(row.testCaseId));
    }
  }
  let hiddenByTcId = new Map<string, boolean>();
  if (testCaseIds.size > 0) {
    const tcs = await TestCaseModel.find({
      _id: { $in: [...testCaseIds].map((id) => new Types.ObjectId(id)) },
    })
      .select("_id isHidden")
      .lean();
    hiddenByTcId = new Map(tcs.map((tc) => [String(tc._id), Boolean(tc.isHidden)]));
  }

  const data = runs.map((run) => ({
    ...run,
    testCaseResults: (run.testCaseResults ?? []).map((row) => {
      const id = row.testCaseId ? String(row.testCaseId) : "";
      const fromDb = id ? hiddenByTcId.get(id) : undefined;
      return {
        ...row,
        isHidden: fromDb !== undefined ? fromDb : Boolean(row.isHidden),
      };
    }),
  }));

  res.json({ ok: true, data });
});


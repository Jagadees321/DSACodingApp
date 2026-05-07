import { Router } from "express";
import { z } from "zod";
import { Types } from "mongoose";
import { requireAdmin, requireAuth } from "../../middleware/auth.js";
import { HttpError } from "../../lib/http-error.js";
import { GroupModel } from "../../models/group.model.js";
import { GroupMembershipModel } from "../../models/group-membership.model.js";
import { NotificationModel } from "../../models/notification.model.js";
import { ProblemModel } from "../../models/problem.model.js";
import { AssignedTestRunEventModel } from "../../models/assigned-test-run-event.model.js";
import { AssignedTestSessionModel } from "../../models/assigned-test-session.model.js";
import { TestAssignmentModel } from "../../models/test-assignment.model.js";
import { TestModel } from "../../models/test.model.js";
import { UserModel } from "../../models/user.model.js";
import { buildCoachReportUserData } from "../../lib/coach-report-user-data.js";
import { generateCoachPerformanceReport } from "../../lib/gemini-coach-report.js";

export const testsRouter = Router();

const objectId = z.string().regex(/^[a-fA-F0-9]{24}$/, "Invalid id");

/** Dashboard overview: one row per test with aggregate attempt stats (admin only). */
testsRouter.get("/admin/dashboard-summary", requireAuth, requireAdmin, async (_req, res) => {
  const tests = await TestModel.find({}).sort({ updatedAt: -1 }).limit(100).lean();

  const rows = await Promise.all(
    tests.map(async (test) => {
      const testOid = test._id;
      const [assignmentCount, sessions] = await Promise.all([
        TestAssignmentModel.countDocuments({ testId: testOid }),
        AssignedTestSessionModel.find({ testId: testOid }).select("userId status").lean(),
      ]);

      const userIds = new Set(sessions.map((s) => String(s.userId)));
      const submittedCount = sessions.filter((s) =>
        ["submitted", "auto_submitted"].includes(s.status),
      ).length;

      return {
        testId: String(test._id),
        title: test.title,
        durationMin: test.durationMin,
        problemCount: test.problemIds?.length ?? 0,
        status: test.status,
        updatedAt: test.updatedAt,
        assignmentCount,
        attemptCount: sessions.length,
        uniqueParticipants: userIds.size,
        submittedCount,
      };
    }),
  );

  res.json({ ok: true, data: rows });
});

/** Per-test participant rows with attempt metrics (admin only). */
testsRouter.get("/:testId/admin/participants", requireAuth, requireAdmin, async (req, res) => {
  const testId = objectId.parse(req.params.testId);
  const test = await TestModel.findById(testId).lean();
  if (!test) throw new HttpError(404, "NOT_FOUND", "Test not found");

  const sessions = await AssignedTestSessionModel.find({ testId: test._id })
    .sort({ updatedAt: -1 })
    .lean();

  const userIds = [...new Set(sessions.map((s) => String(s.userId)))];
  const users =
    userIds.length > 0
      ? await UserModel.find({ _id: { $in: userIds.map((id) => new Types.ObjectId(id)) } })
          .select("_id username email")
          .lean()
      : [];

  const userById = new Map(users.map((u) => [String(u._id), u]));

  const participantRows = await Promise.all(
    sessions.map(async (session) => {
      const u = userById.get(String(session.userId));
      const distinctProblemsRun = await AssignedTestRunEventModel.distinct("problemId", {
        sessionId: session._id,
      });

      const agg = session.aggregate ?? {};
      return {
        sessionId: String(session._id),
        assignmentId: String(session.assignmentId),
        attemptNo: session.attemptNo,
        sessionStatus: session.status,
        submittedAt: session.submittedAt ?? null,
        startedAt: session.startedAt ?? null,
        userId: String(session.userId),
        username: u?.username ?? "?",
        email: u?.email ?? "",
        questionsAttempted: distinctProblemsRun.length,
        questionsInTest: test.problemIds?.length ?? 0,
        totalRuns: agg.totalRuns ?? 0,
        totalTestCasesPassed: agg.totalPassedCases ?? 0,
        totalTestCasesExecuted: agg.totalCasesExecuted ?? 0,
        problemsFullySolvedCount: agg.problemsCompleted ?? 0,
      };
    }),
  );

  res.json({
    ok: true,
    data: {
      test: {
        _id: String(test._id),
        title: test.title,
        durationMin: test.durationMin,
        problemCount: test.problemIds?.length ?? 0,
        instructions: test.instructions,
      },
      participants: participantRows,
    },
  });
});

/** Admin-only: Gemini-generated JSON coach report for one learner session on a test. */
testsRouter.post("/:testId/admin/sessions/:sessionId/ai-report", requireAuth, requireAdmin, async (req, res) => {
  const testId = objectId.parse(req.params.testId);
  const sessionId = objectId.parse(req.params.sessionId);

  const userData = await buildCoachReportUserData({
    sessionId: String(sessionId),
    testId: String(testId),
  });

  try {
    const report = await generateCoachPerformanceReport(userData);
    res.json({ ok: true, data: report });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("GEMINI_API_KEY")) {
      throw new HttpError(503, "SERVICE_UNAVAILABLE", "Gemini is not configured. Set GEMINI_API_KEY on the server.");
    }
    throw new HttpError(502, "AI_REPORT_FAILED", msg);
  }
});

const createGroupSchema = z.object({
  name: z.string().min(2).max(120),
  description: z.string().max(2000).default(""),
});

testsRouter.post("/groups", requireAuth, requireAdmin, async (req, res) => {
  const body = createGroupSchema.parse(req.body);
  const group = await GroupModel.create({
    name: body.name.trim(),
    description: body.description.trim(),
    createdBy: new Types.ObjectId(req.user!.userId),
    isActive: true,
  });
  res.status(201).json({ ok: true, data: group });
});

testsRouter.get("/groups", requireAuth, requireAdmin, async (_req, res) => {
  const groups = await GroupModel.find({ isActive: true }).sort({ createdAt: -1 }).lean();
  res.json({ ok: true, data: groups });
});

testsRouter.get("/users", requireAuth, requireAdmin, async (req, res) => {
  const query = z
    .object({
      q: z.string().optional(),
      limit: z.coerce.number().int().min(1).max(200).default(50),
    })
    .parse(req.query);

  const filter: Record<string, unknown> = {};
  if (query.q?.trim()) {
    const pattern = new RegExp(query.q.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    filter.$or = [{ username: pattern }, { email: pattern }];
  }

  const users = await UserModel.find(filter)
    .select("_id username email role")
    .sort({ createdAt: -1 })
    .limit(query.limit)
    .lean();

  res.json({ ok: true, data: users });
});

const addGroupMembersSchema = z.object({
  userIds: z.array(objectId).min(1).max(500),
});

testsRouter.post("/groups/:groupId/members", requireAuth, requireAdmin, async (req, res) => {
  const groupId = objectId.parse(req.params.groupId);
  const body = addGroupMembersSchema.parse(req.body);
  const group = await GroupModel.findById(groupId);
  if (!group || !group.isActive) throw new HttpError(404, "NOT_FOUND", "Group not found");

  for (const userId of body.userIds) {
    await GroupMembershipModel.findOneAndUpdate(
      { groupId: group._id, userId: new Types.ObjectId(userId), isActive: true },
      {
        $setOnInsert: {
          groupId: group._id,
          userId: new Types.ObjectId(userId),
          role: "member",
          joinedAt: new Date(),
          isActive: true,
        },
      },
      { upsert: true, new: true },
    );
  }
  const activeCount = await GroupMembershipModel.countDocuments({ groupId: group._id, isActive: true });
  group.memberCount = activeCount;
  await group.save();
  res.status(201).json({ ok: true, data: { groupId, memberCount: activeCount } });
});

const createTestSchema = z.object({
  title: z.string().min(2).max(160),
  description: z.string().max(4000).default(""),
  instructions: z.string().max(10000).default(""),
  durationMin: z.number().int().min(1).max(24 * 60),
  problemIds: z.array(objectId).min(1).max(100),
  status: z.enum(["draft", "published", "archived"]).default("draft"),
});

testsRouter.post("/", requireAuth, requireAdmin, async (req, res) => {
  const body = createTestSchema.parse(req.body);
  const count = await ProblemModel.countDocuments({ _id: { $in: body.problemIds.map((id) => new Types.ObjectId(id)) } });
  if (count !== body.problemIds.length) {
    throw new HttpError(400, "VALIDATION_ERROR", "One or more problem ids are invalid");
  }

  const test = await TestModel.create({
    title: body.title.trim(),
    description: body.description.trim(),
    instructions: body.instructions.trim(),
    durationMin: body.durationMin,
    problemIds: body.problemIds.map((id) => new Types.ObjectId(id)),
    status: body.status,
    createdBy: new Types.ObjectId(req.user!.userId),
  });
  res.status(201).json({ ok: true, data: test });
});

testsRouter.get("/", requireAuth, requireAdmin, async (req, res) => {
  const query = z
    .object({
      status: z.enum(["draft", "published", "archived"]).optional(),
      limit: z.coerce.number().int().min(1).max(100).default(30),
    })
    .parse(req.query);

  const filter: Record<string, unknown> = {};
  if (query.status) filter.status = query.status;

  const tests = await TestModel.find(filter).sort({ updatedAt: -1 }).limit(query.limit).lean();
  res.json({ ok: true, data: tests });
});

const assignTestSchema = z.object({
  targetUsers: z.array(objectId).default([]),
  targetGroups: z.array(objectId).default([]),
  startAt: z.string().datetime(),
  dueAt: z.string().datetime(),
  allowLate: z.boolean().default(false),
  maxAttemptsPerUser: z.number().int().min(1).max(20).default(1),
  notificationTemplate: z.string().max(2000).default(""),
});

testsRouter.post("/:testId/assign", requireAuth, requireAdmin, async (req, res) => {
  const testId = objectId.parse(req.params.testId);
  const body = assignTestSchema.parse(req.body);
  if (body.targetUsers.length === 0 && body.targetGroups.length === 0) {
    throw new HttpError(400, "VALIDATION_ERROR", "Provide at least one target user or target group");
  }

  const test = await TestModel.findById(testId).lean();
  if (!test) throw new HttpError(404, "NOT_FOUND", "Test not found");

  const startAt = new Date(body.startAt);
  const dueAt = new Date(body.dueAt);
  if (dueAt <= startAt) {
    throw new HttpError(400, "VALIDATION_ERROR", "dueAt must be after startAt");
  }

  const targetUserIds = body.targetUsers.map((id) => new Types.ObjectId(id));
  const targetGroupIds = body.targetGroups.map((id) => new Types.ObjectId(id));

  const assignment = await TestAssignmentModel.create({
    testId: new Types.ObjectId(testId),
    assignedBy: new Types.ObjectId(req.user!.userId),
    targetUsers: targetUserIds,
    targetGroups: targetGroupIds,
    startAt,
    dueAt,
    allowLate: body.allowLate,
    maxAttemptsPerUser: body.maxAttemptsPerUser,
    status: startAt <= new Date() ? "active" : "scheduled",
    notificationTemplate: body.notificationTemplate.trim(),
  });

  const groupMembers = targetGroupIds.length
    ? await GroupMembershipModel.find({
        groupId: { $in: targetGroupIds },
        isActive: true,
      })
        .select("userId")
        .lean()
    : [];

  const allUserIds = new Set<string>([
    ...targetUserIds.map((id) => String(id)),
    ...groupMembers.map((m) => String(m.userId)),
  ]);

  const notifications = [...allUserIds].map((userId) => ({
    userId: new Types.ObjectId(userId),
    type: "test_assigned" as const,
    title: `New test assigned: ${test.title}`,
    body:
      body.notificationTemplate.trim() ||
      `You have been assigned "${test.title}". Start: ${startAt.toISOString()} Due: ${dueAt.toISOString()}`,
    metadata: {
      assignmentId: assignment._id,
      testId: test._id,
    },
    isRead: false,
    createdAt: new Date(),
  }));

  if (notifications.length > 0) await NotificationModel.insertMany(notifications);

  res.status(201).json({
    ok: true,
    data: {
      assignmentId: assignment._id,
      notifiedUsers: notifications.length,
    },
  });
});


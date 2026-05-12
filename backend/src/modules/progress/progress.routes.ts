import { Types } from "mongoose";
import { Router } from "express";
import { z } from "zod";
import { requireAdmin, requireAuth } from "../../middleware/auth.js";
import { ProblemModel } from "../../models/problem.model.js";
import { SubmissionModel } from "../../models/submission.model.js";
import { UserModel } from "../../models/user.model.js";
import { UserProgressModel } from "../../models/user-progress.model.js";

export const progressRouter = Router();

progressRouter.get("/me", requireAuth, async (req, res) => {
  const userId = req.user!.userId;
  const [user, progress, totalPublishedProblems, publishedProblems] = await Promise.all([
    UserModel.findById(userId).select("currentLevel totalXp streakDays").lean(),
    UserProgressModel.find({ userId }).lean(),
    ProblemModel.countDocuments({ isPublished: true }),
    ProblemModel.find({ isPublished: true }).select("_id slug").lean(),
  ]);

  const publishedIdSet = new Set(publishedProblems.map((p) => String(p._id)));
  const idToSlug = new Map(publishedProblems.map((p) => [String(p._id), p.slug]));
  const solvedSlugs = progress
    .filter((p) => p.status === "solved" && publishedIdSet.has(String(p.problemId)))
    .map((p) => idToSlug.get(String(p.problemId)))
    .filter((s): s is string => Boolean(s));

  /** One count per published problem only (matches UI dots and admin table). */
  const solved = progress.filter(
    (p) => p.status === "solved" && publishedIdSet.has(String(p.problemId)),
  ).length;
  const attempted = progress.filter(
    (p) => p.status !== "not_started" && publishedIdSet.has(String(p.problemId)),
  ).length;

  res.json({
    ok: true,
    data: {
      user,
      summary: {
        solved,
        attempted,
        totalTracked: progress.length,
        totalPublishedProblems,
      },
      solvedSlugs,
      items: progress,
    },
  });
});

/** Per-user solved counts vs total published problems (admin). */
progressRouter.get("/admin/users-solved-summary", requireAuth, requireAdmin, async (_req, res) => {
  const totalPublishedProblems = await ProblemModel.countDocuments({ isPublished: true });
  const publishedProblemIds = await ProblemModel.distinct("_id", { isPublished: true });

  const solvedRows = await UserProgressModel.aggregate<{ _id: Types.ObjectId; solvedCount: number }>([
    { $match: { status: "solved", problemId: { $in: publishedProblemIds } } },
    { $group: { _id: "$userId", solvedCount: { $sum: 1 } } },
  ]);
  const solvedMap = new Map(solvedRows.map((r) => [String(r._id), r.solvedCount]));

  const users = await UserModel.find().select("username email role").sort({ username: 1 }).lean();

  res.json({
    ok: true,
    data: {
      totalPublishedProblems,
      users: users.map((u) => ({
        userId: String(u._id),
        username: u.username,
        email: u.email,
        role: u.role,
        solvedCount: solvedMap.get(String(u._id)) ?? 0,
      })),
    },
  });
});

const leaderboardQuerySchema = z.object({
  period: z.enum(["weekly", "monthly", "overall"]).default("overall"),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

progressRouter.get("/leaderboard", requireAuth, async (req, res) => {
  const query = leaderboardQuerySchema.parse(req.query);
  const now = new Date();
  const since =
    query.period === "weekly"
      ? new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      : query.period === "monthly"
        ? new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        : null;

  const publishedProblemIds = await ProblemModel.distinct("_id", { isPublished: true });
  const match: Record<string, unknown> = {
    status: "accepted",
    problemId: { $in: publishedProblemIds },
  };
  if (since) match.submittedAt = { $gte: since };

  const rows = await SubmissionModel.aggregate<{
    _id: string;
    solvedCount: number;
    username: string;
  }>([
    { $match: match },
    // Unique solve per (user, problem) for this period.
    { $group: { _id: { userId: "$userId", problemId: "$problemId" } } },
    { $group: { _id: "$_id.userId", solvedCount: { $sum: 1 } } },
    {
      $lookup: {
        from: "users",
        localField: "_id",
        foreignField: "_id",
        as: "user",
      },
    },
    { $unwind: "$user" },
    { $project: { _id: 1, solvedCount: 1, username: "$user.username" } },
    { $sort: { solvedCount: -1, username: 1 } },
  ]);

  const ranked = rows.map((r, i) => ({
    rank: i + 1,
    userId: String(r._id),
    username: r.username,
    solvedCount: r.solvedCount,
  }));

  const currentUser = ranked.find((r) => r.userId === req.user!.userId) ?? {
    rank: null,
    userId: req.user!.userId,
    username: (await UserModel.findById(req.user!.userId).select("username").lean())?.username ?? "you",
    solvedCount: 0,
  };

  res.json({
    ok: true,
    data: {
      period: query.period,
      generatedAt: now.toISOString(),
      leaders: ranked.slice(0, query.limit),
      currentUser,
    },
  });
});


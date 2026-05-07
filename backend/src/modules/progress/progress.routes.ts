import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../../middleware/auth.js";
import { SubmissionModel } from "../../models/submission.model.js";
import { UserModel } from "../../models/user.model.js";
import { UserProgressModel } from "../../models/user-progress.model.js";

export const progressRouter = Router();

progressRouter.get("/me", requireAuth, async (req, res) => {
  const [user, progress] = await Promise.all([
    UserModel.findById(req.user!.userId).select("currentLevel totalXp streakDays").lean(),
    UserProgressModel.find({ userId: req.user!.userId }).lean(),
  ]);

  const solved = progress.filter((p) => p.status === "solved").length;
  const attempted = progress.filter((p) => p.status !== "not_started").length;

  res.json({
    ok: true,
    data: {
      user,
      summary: { solved, attempted, totalTracked: progress.length },
      items: progress,
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

  const match: Record<string, unknown> = { status: "accepted" };
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


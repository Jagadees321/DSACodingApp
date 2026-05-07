import { Router } from "express";
import { z } from "zod";
import { requireAdmin, requireAuth } from "../../middleware/auth.js";
import { FundamentalModel } from "../../models/fundamental.model.js";
import { UserFundamentalModel } from "../../models/user-fundamental.model.js";
import { HttpError } from "../../lib/http-error.js";
import { defaultFundamentals } from "./default-fundamentals.js";

export const fundamentalsRouter = Router();

fundamentalsRouter.get("/", async (req, res) => {
  const query = z.object({ category: z.string().optional() }).parse(req.query);
  const filter: Record<string, unknown> = { isPublished: true };
  if (query.category) filter.category = query.category;
  const items = await FundamentalModel.find(filter).sort({ orderIndex: 1 }).lean();
  res.json({ ok: true, data: items });
});

const fundamentalInput = z.object({
  title: z.string().min(2),
  slug: z.string().min(2),
  category: z.string().min(1),
  summary: z.string().min(1),
  content: z.string().min(1),
  relatedProblemSlugs: z.array(z.string()).default([]),
  orderIndex: z.number().int().min(1),
  isPublished: z.boolean().default(true),
});

fundamentalsRouter.post("/", requireAuth, requireAdmin, async (req, res) => {
  const data = fundamentalInput.parse(req.body);
  const created = await FundamentalModel.create(data);
  res.status(201).json({ ok: true, data: created });
});

fundamentalsRouter.post("/seed-defaults", requireAuth, requireAdmin, async (_req, res) => {
  const created: string[] = [];
  const existing: string[] = [];

  for (const item of defaultFundamentals) {
    const found = await FundamentalModel.findOne({ slug: item.slug }).select("_id").lean();
    if (found) {
      existing.push(item.slug);
      continue;
    }
    await FundamentalModel.create(item);
    created.push(item.slug);
  }

  res.status(201).json({
    ok: true,
    data: {
      createdCount: created.length,
      createdSlugs: created,
      existingCount: existing.length,
      existingSlugs: existing,
    },
  });
});

fundamentalsRouter.put("/:slug", requireAuth, requireAdmin, async (req, res) => {
  const data = fundamentalInput.partial().parse(req.body);
  const updated = await FundamentalModel.findOneAndUpdate({ slug: req.params.slug }, data, { new: true });
  if (!updated) throw new HttpError(404, "NOT_FOUND", "Fundamental not found");
  res.json({ ok: true, data: updated });
});

fundamentalsRouter.post("/:slug/complete", requireAuth, async (req, res) => {
  const fundamental = await FundamentalModel.findOne({ slug: req.params.slug }).lean();
  if (!fundamental) throw new HttpError(404, "NOT_FOUND", "Fundamental not found");
  const doc = await UserFundamentalModel.findOneAndUpdate(
    { userId: req.user!.userId, fundamentalId: fundamental._id },
    { isCompleted: true, completedAt: new Date() },
    { upsert: true, new: true },
  );
  res.json({ ok: true, data: doc });
});

fundamentalsRouter.delete("/:slug/complete", requireAuth, async (req, res) => {
  const fundamental = await FundamentalModel.findOne({ slug: req.params.slug }).lean();
  if (!fundamental) throw new HttpError(404, "NOT_FOUND", "Fundamental not found");
  await UserFundamentalModel.findOneAndUpdate(
    { userId: req.user!.userId, fundamentalId: fundamental._id },
    { isCompleted: false, completedAt: null },
    { upsert: true },
  );
  res.json({ ok: true });
});


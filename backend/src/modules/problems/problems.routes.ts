import { Router } from "express";
import { z } from "zod";
import { optionalAuth, requireAdmin, requireAuth } from "../../middleware/auth.js";
import { ProblemModel } from "../../models/problem.model.js";
import { ProblemVisualizationModel } from "../../models/problem-visualization.model.js";
import { TestCaseModel } from "../../models/test-case.model.js";
import { HttpError } from "../../lib/http-error.js";
import { stdinExpectedPairSchema } from "../../lib/test-case-schema.js";
import { visualizeRateLimit } from "../../middleware/visualize-rate-limit.js";
import { hashVisualizationKey } from "../../lib/source-hash.js";
import { generateVisualizationHtml } from "../../lib/gemini-visualize.js";
import { logger } from "../../lib/logger.js";

export const problemRouter = Router();

function visualizeFailureUserMessage(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err);
  const cleaned = raw.replace(/\s+/g, " ").trim();
  const clipped = cleaned.slice(0, 480);
  return clipped || "Could not generate visualization";
}

const querySchema = z.object({
  level: z.coerce.number().int().min(1).max(5).optional(),
  category: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

problemRouter.get("/", async (req, res) => {
  const query = querySchema.parse(req.query);
  const filter: Record<string, unknown> = { isPublished: true };
  if (query.level) filter.level = query.level;
  if (query.category) filter.category = query.category;

  const [items, total] = await Promise.all([
    ProblemModel.find(filter)
      .select("-solution")
      .sort({ orderIndex: 1 })
      .skip((query.page - 1) * query.limit)
      .limit(query.limit)
      .lean(),
    ProblemModel.countDocuments(filter),
  ]);
  res.json({ ok: true, data: { items, total, page: query.page, limit: query.limit } });
});

const visualizeBodySchema = z.object({
  sourceCode: z.string().min(1).max(100_000),
  language: z.enum(["java", "python"]),
});

problemRouter.post("/:slug/visualize", requireAuth, visualizeRateLimit, async (req, res) => {
  const slug = String(req.params.slug);
  const body = visualizeBodySchema.parse(req.body);
  const problem = await ProblemModel.findOne({ slug }).lean();
  if (!problem) throw new HttpError(404, "NOT_FOUND", "Problem not found");

  const sourceHash = hashVisualizationKey({
    slug,
    language: body.language,
    sourceCode: body.sourceCode,
  });

  const cached = await ProblemVisualizationModel.findOne({ problemId: problem._id, sourceHash }).lean();
  if (cached) {
    res.json({ ok: true, data: { html: cached.html, cached: true } });
    return;
  }

  let html: string;
  try {
    html = await generateVisualizationHtml({
      language: body.language,
      userSourceCode: body.sourceCode,
      problem: {
        slug: problem.slug,
        title: problem.title,
        description: problem.description,
        constraints: [...(problem.constraints ?? [])],
        examples: (problem.examples ?? []).map((ex) => ({
          input: ex.input,
          output: ex.output,
          explanation: ex.explanation ?? undefined,
        })),
        referenceSolution:
          body.language === "java" ? problem.solution.java : problem.solution.python,
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("GEMINI_API_KEY")) {
      throw new HttpError(503, "VISUALIZE_UNAVAILABLE", "Visualization service is not configured");
    }
    const lower = msg.toLowerCase();
    if (
      lower.includes("credit balance is too low") ||
      lower.includes("purchase credits") ||
      lower.includes("billing")
    ) {
      logger.warn({ slug, requestId: req.id }, "problem visualize: Gemini insufficient credits");
      throw new HttpError(
        503,
        "GEMINI_INSUFFICIENT_CREDITS",
        "Your Gemini API account needs billing setup. In Google AI Studio / Google Cloud Billing, add an active payment method or credits, then try Visualize again.",
      );
    }
    logger.warn({ err, slug, requestId: req.id }, "problem visualize: generation failed");
    throw new HttpError(502, "VISUALIZE_FAILED", visualizeFailureUserMessage(err));
  }

  try {
    await ProblemVisualizationModel.create({
      problemId: problem._id,
      language: body.language,
      sourceHash,
      html,
    });
  } catch {
    const dup = await ProblemVisualizationModel.findOne({ problemId: problem._id, sourceHash }).lean();
    if (dup) {
      res.json({ ok: true, data: { html: dup.html, cached: true } });
      return;
    }
    throw new HttpError(500, "INTERNAL_ERROR", "Could not store visualization");
  }

  res.json({ ok: true, data: { html, cached: false } });
});

problemRouter.get("/:slug", optionalAuth, async (req, res) => {
  const problem = await ProblemModel.findOne({ slug: req.params.slug }).lean();
  if (!problem) throw new HttpError(404, "NOT_FOUND", "Problem not found");

  const testCases = await TestCaseModel.find({ problemId: problem._id, isHidden: false })
    .sort({ orderIndex: 1 })
    .lean();

  const isAdmin = req.user?.role === "admin";
  const { solution, ...rest } = problem;
  const payload = isAdmin ? { ...problem, testCases } : { ...rest, testCases };

  res.json({ ok: true, data: payload });
});

const problemInput = z.object({
  slug: z.string().min(2),
  title: z.string().min(2),
  level: z.number().int().min(1).max(5),
  difficulty: z.string().min(1),
  category: z.string().min(1),
  description: z.string().min(1),
  constraints: z.array(z.string()).default([]),
  examples: z.array(z.object({ input: z.string(), output: z.string(), explanation: z.string().optional() })),
  tags: z.array(z.string()).default([]),
  xpReward: z.number().int().min(0).default(0),
  orderIndex: z.number().int().min(1),
  isPublished: z.boolean().default(true),
  starter: z.object({ java: z.string(), python: z.string() }),
  solution: z.object({ java: z.string(), python: z.string() }),
});

problemRouter.post("/", requireAuth, requireAdmin, async (req, res) => {
  const data = problemInput.parse(req.body);
  const created = await ProblemModel.create(data);
  res.status(201).json({ ok: true, data: created });
});

const bulkProblemItemSchema = problemInput.extend({
  sampleTests: z.array(stdinExpectedPairSchema).default([]),
  hiddenTests: z.array(stdinExpectedPairSchema).default([]),
});

const bulkProblemsSchema = z.object({
  problems: z.array(bulkProblemItemSchema).min(1).max(200),
});

problemRouter.post("/bulk", requireAuth, requireAdmin, async (req, res) => {
  const body = bulkProblemsSchema.parse(req.body);
  const created: string[] = [];
  const failed: { slug: string; error: string }[] = [];

  for (const item of body.problems) {
    try {
      const { sampleTests, hiddenTests, ...problemFields } = item;
      await ProblemModel.create(problemFields);

      const testCases = [
        ...sampleTests.map((t, i) => ({
          stdin: t.stdin,
          expectedOutput: t.expectedOutput,
          isHidden: false,
          label: `Sample ${i + 1}`,
          orderIndex: i + 1,
        })),
        ...hiddenTests.map((t, i) => ({
          stdin: t.stdin,
          expectedOutput: t.expectedOutput,
          isHidden: true,
          label: `Hidden ${i + 1}`,
          orderIndex: sampleTests.length + i + 1,
        })),
      ];

      const problem = await ProblemModel.findOne({ slug: problemFields.slug });
      if (!problem) throw new Error("Problem not found after create");
      await TestCaseModel.deleteMany({ problemId: problem._id });
      if (testCases.length > 0) {
        await TestCaseModel.insertMany(testCases.map((tc) => ({ ...tc, problemId: problem._id })));
      }
      created.push(problemFields.slug);
    } catch (err) {
      failed.push({
        slug: item.slug,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  res.status(201).json({
    ok: true,
    data: {
      createdCount: created.length,
      createdSlugs: created,
      failed,
    },
  });
});

problemRouter.put("/:slug", requireAuth, requireAdmin, async (req, res) => {
  const data = problemInput.partial().parse(req.body);
  const updated = await ProblemModel.findOneAndUpdate({ slug: req.params.slug }, data, { new: true });
  if (!updated) throw new HttpError(404, "NOT_FOUND", "Problem not found");
  res.json({ ok: true, data: updated });
});

problemRouter.post("/:slug/publish", requireAuth, requireAdmin, async (req, res) => {
  const body = z.object({ isPublished: z.boolean() }).parse(req.body);
  const updated = await ProblemModel.findOneAndUpdate(
    { slug: req.params.slug },
    { isPublished: body.isPublished },
    { new: true },
  );
  if (!updated) throw new HttpError(404, "NOT_FOUND", "Problem not found");
  res.json({ ok: true, data: updated });
});


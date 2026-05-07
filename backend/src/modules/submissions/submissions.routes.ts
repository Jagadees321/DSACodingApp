import { Router } from "express";
import { z } from "zod";
import { requireAdmin, requireAuth } from "../../middleware/auth.js";
import { HttpError } from "../../lib/http-error.js";
import { normalizeTestPair } from "../../lib/test-case-schema.js";
import { ProblemModel } from "../../models/problem.model.js";
import { SubmissionModel } from "../../models/submission.model.js";
import { TestCaseModel } from "../../models/test-case.model.js";
import { submissionQueue } from "../../queue/submission.queue.js";

export const submissionsRouter = Router();

const createSubmissionSchema = z.object({
  problemSlug: z.string().min(1),
  sourceCode: z.string().min(1),
  language: z.enum(["java", "python"]),
});

submissionsRouter.post("/", requireAuth, async (req, res) => {
  const body = createSubmissionSchema.parse(req.body);
  const problem = await ProblemModel.findOne({ slug: body.problemSlug }).lean();
  if (!problem) throw new HttpError(404, "NOT_FOUND", "Problem not found");

  const submission = await SubmissionModel.create({
    userId: req.user!.userId,
    problemId: problem._id,
    sourceCode: body.sourceCode,
    language: body.language,
    status: "queued",
    testCasesTotal: await TestCaseModel.countDocuments({ problemId: problem._id }),
  });

  await submissionQueue.add("judge", {
    submissionId: String(submission._id),
    problemId: String(problem._id),
    language: body.language,
    sourceCode: body.sourceCode,
  });

  res.status(202).json({ ok: true, data: { submissionId: submission._id, status: submission.status } });
});

submissionsRouter.get("/", requireAuth, async (req, res) => {
  const query = z
    .object({
      problemSlug: z.string().optional(),
      limit: z.coerce.number().int().min(1).max(50).default(20),
    })
    .parse(req.query);

  let problemId: string | undefined;
  if (query.problemSlug) {
    const problem = await ProblemModel.findOne({ slug: query.problemSlug }).lean();
    if (!problem) throw new HttpError(404, "NOT_FOUND", "Problem not found");
    problemId = String(problem._id);
  }
  const filter: Record<string, unknown> = { userId: req.user!.userId };
  if (problemId) filter.problemId = problemId;
  const items = await SubmissionModel.find(filter).sort({ submittedAt: -1 }).limit(query.limit).lean();
  res.json({ ok: true, data: items });
});

submissionsRouter.get("/problem/:slug/latest", requireAuth, async (req, res) => {
  const problem = await ProblemModel.findOne({ slug: req.params.slug }).lean();
  if (!problem) throw new HttpError(404, "NOT_FOUND", "Problem not found");
  const latest = await SubmissionModel.findOne({
    userId: req.user!.userId,
    problemId: problem._id,
  })
    .sort({ submittedAt: -1 })
    .lean();
  res.json({ ok: true, data: latest });
});

submissionsRouter.get("/:id", requireAuth, async (req, res) => {
  const submission = await SubmissionModel.findById(req.params.id).lean();
  if (!submission) throw new HttpError(404, "NOT_FOUND", "Submission not found");
  if (String(submission.userId) !== req.user!.userId && req.user!.role !== "admin") {
    throw new HttpError(403, "FORBIDDEN", "Not allowed");
  }
  const ids = (submission.testCaseResults ?? [])
    .map((r) => String(r.testCaseId))
    .filter(Boolean);

  const testCases = ids.length
    ? await TestCaseModel.find({ _id: { $in: ids } })
        .select("_id stdin expectedOutput isHidden orderIndex")
        .lean()
    : [];
  const testCaseById = new Map(testCases.map((tc) => [String(tc._id), tc]));

  const testCaseResults = (submission.testCaseResults ?? []).map((result) => {
    const tc = testCaseById.get(String(result.testCaseId));
    return {
      ...result,
      stdin: tc?.stdin ?? "",
      expectedOutput: tc?.expectedOutput ?? "",
      isHidden: tc?.isHidden ?? true,
      orderIndex: tc?.orderIndex ?? 0,
    };
  });

  res.json({ ok: true, data: { ...submission, testCaseResults } });
});

const testCaseInput = z.preprocess(
  normalizeTestPair,
  z.object({
    stdin: z.string(),
    expectedOutput: z.unknown().transform((v) => (typeof v === "string" ? v : JSON.stringify(v))),
    isHidden: z.boolean().default(true),
    orderIndex: z.number().int().min(1),
    label: z.string().default(""),
  }),
);

submissionsRouter.post("/admin/problem/:slug/test-cases", requireAuth, requireAdmin, async (req, res) => {
  const body = z.array(testCaseInput).parse(req.body);
  const problem = await ProblemModel.findOne({ slug: req.params.slug });
  if (!problem) throw new HttpError(404, "NOT_FOUND", "Problem not found");
  await TestCaseModel.deleteMany({ problemId: problem._id });
  const docs = await TestCaseModel.insertMany(
    body.map((item) => ({
      ...item,
      problemId: problem._id,
    })),
  );
  res.status(201).json({ ok: true, data: docs });
});

submissionsRouter.get("/admin/problem/:slug/test-cases", requireAuth, requireAdmin, async (req, res) => {
  const problem = await ProblemModel.findOne({ slug: req.params.slug }).lean();
  if (!problem) throw new HttpError(404, "NOT_FOUND", "Problem not found");
  const docs = await TestCaseModel.find({ problemId: problem._id }).sort({ orderIndex: 1 }).lean();
  res.json({ ok: true, data: docs });
});


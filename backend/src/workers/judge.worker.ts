import { Worker } from "bullmq";
import mongoose from "mongoose";
import { connectMongo } from "../config/db.js";
import { redis } from "../config/redis.js";
import { runInDockerSandbox } from "../judge/docker-runner.js";
import { logger } from "../lib/logger.js";
import { submissionCounter } from "../lib/metrics.js";
import { SubmissionModel } from "../models/submission.model.js";
import { TestCaseModel } from "../models/test-case.model.js";
import { SubmissionJobPayload } from "../queue/submission.queue.js";
import { UserProgressModel } from "../models/user-progress.model.js";

async function startWorker() {
  await connectMongo();
  const worker = new Worker<SubmissionJobPayload>(
    "submission-judge",
    async (job) => {
      const submission = await SubmissionModel.findById(job.data.submissionId);
      if (!submission) return;

      submission.status = "running";
      await submission.save();

      const testCases = await TestCaseModel.find({ problemId: submission.problemId }).sort({ orderIndex: 1 });
      let passed = 0;
      const results = [];
      let failedStatus: "accepted" | "failed" | "runtime_error" | "compile_error" = "failed";

      for (const test of testCases) {
        const result = await runInDockerSandbox({
          language: submission.language,
          sourceCode: submission.sourceCode,
          stdin: test.stdin,
          expectedOutput: test.expectedOutput,
        });

        const isPass = result.status === "accepted";
        if (isPass) passed += 1;
        else failedStatus = result.status;

        results.push({
          testCaseId: test._id,
          passed: isPass,
          stdout: result.stdout,
          stderr: result.stderr,
          executionTimeMs: result.executionTimeMs,
          memoryKb: result.memoryKb,
        });

        submission.testCasesTotal = testCases.length;
        submission.testCasesPassed = passed;
        submission.testCaseResults = results as any;
        submission.executionTimeMs = results.reduce((sum, r) => sum + r.executionTimeMs, 0);
        submission.status = isPass ? "running" : failedStatus;
        await submission.save();

        if (!isPass) break;
      }

      submission.testCasesTotal = testCases.length;
      submission.testCasesPassed = passed;
      submission.testCaseResults = results as any;
      submission.executionTimeMs = results.reduce((sum, r) => sum + r.executionTimeMs, 0);
      submission.status = passed === testCases.length ? "accepted" : failedStatus;
      submission.submittedAt = new Date();
      await submission.save();
      submissionCounter.inc({ status: submission.status });

      await UserProgressModel.findOneAndUpdate(
        { userId: submission.userId, problemId: submission.problemId },
        {
          status: submission.status === "accepted" ? "solved" : "attempted",
          bestLanguage: submission.language,
          $inc: { attemptsCount: 1, xpEarned: submission.status === "accepted" ? 50 : 0 },
          firstSolvedAt: submission.status === "accepted" ? new Date() : undefined,
          lastAttemptedAt: new Date(),
        },
        { upsert: true },
      );
    },
    { connection: redis, concurrency: 2 },
  );

  worker.on("completed", (job) => logger.info({ jobId: job.id }, "Judge job completed"));
  worker.on("failed", (job, error) => logger.error({ jobId: job?.id, err: error }, "Judge job failed"));
}

startWorker().catch((error) => {
  logger.error({ err: error }, "Worker startup failed");
  if (mongoose.connection.readyState === 1) mongoose.disconnect().catch(() => {});
  process.exit(1);
});


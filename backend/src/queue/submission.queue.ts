import { Queue } from "bullmq";
import { redis } from "../config/redis.js";

export type SubmissionJobPayload = {
  submissionId: string;
  problemId: string;
  language: "java" | "python";
  sourceCode: string;
};

export const submissionQueue = new Queue<SubmissionJobPayload>("submission-judge", {
  connection: redis,
  defaultJobOptions: {
    removeOnComplete: 1000,
    removeOnFail: 1000,
    attempts: 2,
    backoff: { type: "exponential", delay: 1500 },
  },
});


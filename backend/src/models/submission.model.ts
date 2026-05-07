import { InferSchemaType, model, Schema, Types } from "mongoose";

const testCaseResultSchema = new Schema(
  {
    testCaseId: { type: Types.ObjectId, required: true, ref: "TestCase" },
    passed: { type: Boolean, required: true },
    stdout: { type: String, default: "" },
    stderr: { type: String, default: "" },
    executionTimeMs: { type: Number, default: 0 },
    memoryKb: { type: Number, default: 0 },
  },
  { _id: false },
);

const submissionSchema = new Schema(
  {
    userId: { type: Types.ObjectId, required: true, ref: "User", index: true },
    problemId: { type: Types.ObjectId, required: true, ref: "Problem", index: true },
    sourceCode: { type: String, required: true },
    language: { type: String, enum: ["java", "python"], required: true },
    status: {
      type: String,
      enum: ["queued", "running", "accepted", "failed", "runtime_error", "compile_error"],
      default: "queued",
      index: true,
    },
    judgeToken: { type: Number, default: 0 },
    executionTimeMs: { type: Number, default: 0 },
    memoryUsedKb: { type: Number, default: 0 },
    testCasesPassed: { type: Number, default: 0 },
    testCasesTotal: { type: Number, default: 0 },
    testCaseResults: { type: [testCaseResultSchema], default: [] },
    compilerOutput: { type: String, default: "" },
    errorMessage: { type: String, default: "" },
    submittedAt: { type: Date, default: Date.now, index: true },
  },
  { timestamps: false },
);

submissionSchema.index({ userId: 1, submittedAt: -1 });
submissionSchema.index({ problemId: 1, submittedAt: -1 });

export type SubmissionDocument = InferSchemaType<typeof submissionSchema>;
export const SubmissionModel = model<SubmissionDocument>("Submission", submissionSchema);


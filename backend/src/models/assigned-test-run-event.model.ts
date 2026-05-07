import { InferSchemaType, model, Schema, Types } from "mongoose";

const assignedRunCaseResultSchema = new Schema(
  {
    testCaseId: { type: Types.ObjectId, required: true, ref: "TestCase" },
    isHidden: { type: Boolean, default: false },
    stdinSnapshot: { type: String, default: "" },
    expectedOutputSnapshot: { type: String, default: "" },
    passed: { type: Boolean, required: true },
    stdout: { type: String, default: "" },
    stderr: { type: String, default: "" },
    executionTimeMs: { type: Number, default: 0 },
    memoryKb: { type: Number, default: 0 },
  },
  { _id: false },
);

const assignedTestRunEventSchema = new Schema(
  {
    sessionId: { type: Types.ObjectId, required: true, ref: "AssignedTestSession", index: true },
    assignmentId: { type: Types.ObjectId, required: true, ref: "TestAssignment", index: true },
    testId: { type: Types.ObjectId, required: true, ref: "Test", index: true },
    userId: { type: Types.ObjectId, required: true, ref: "User", index: true },
    problemId: { type: Types.ObjectId, required: true, ref: "Problem", index: true },
    sourceCode: { type: String, required: true },
    language: { type: String, enum: ["java", "python"], required: true },
    runNo: { type: Number, required: true, min: 1 },
    status: {
      type: String,
      enum: ["queued", "running", "accepted", "failed", "runtime_error", "compile_error"],
      required: true,
      index: true,
    },
    testCasesPassed: { type: Number, default: 0 },
    testCasesTotal: { type: Number, default: 0 },
    testCaseResults: { type: [assignedRunCaseResultSchema], default: [] },
    compilerOutput: { type: String, default: "" },
    errorMessage: { type: String, default: "" },
    judgeToken: { type: Number, default: 0 },
    submittedAt: { type: Date, default: Date.now, index: true },
  },
  { timestamps: false },
);

assignedTestRunEventSchema.index({ sessionId: 1, problemId: 1, runNo: 1 }, { unique: true });
assignedTestRunEventSchema.index({ userId: 1, submittedAt: -1 });
assignedTestRunEventSchema.index({ assignmentId: 1, problemId: 1, submittedAt: -1 });

export type AssignedTestRunEventDocument = InferSchemaType<typeof assignedTestRunEventSchema>;
export const AssignedTestRunEventModel = model<AssignedTestRunEventDocument>(
  "AssignedTestRunEvent",
  assignedTestRunEventSchema,
);


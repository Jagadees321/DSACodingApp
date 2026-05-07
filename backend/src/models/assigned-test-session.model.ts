import { InferSchemaType, model, Schema, Types } from "mongoose";

const assignedProblemStateSchema = new Schema(
  {
    problemId: { type: Types.ObjectId, required: true, ref: "Problem" },
    language: { type: String, enum: ["java", "python"], default: "python" },
    currentCode: { type: String, default: "" },
    finalCode: { type: String, default: "" },
    openedAt: { type: Date },
    lastRunAt: { type: Date },
    isSubmitted: { type: Boolean, default: false },
  },
  { _id: false },
);

const assignedSessionAggregateSchema = new Schema(
  {
    totalRuns: { type: Number, default: 0 },
    totalPassedCases: { type: Number, default: 0 },
    totalCasesExecuted: { type: Number, default: 0 },
    problemsCompleted: { type: Number, default: 0 },
  },
  { _id: false },
);

const assignedTestSessionSchema = new Schema(
  {
    assignmentId: { type: Types.ObjectId, required: true, ref: "TestAssignment", index: true },
    testId: { type: Types.ObjectId, required: true, ref: "Test", index: true },
    userId: { type: Types.ObjectId, required: true, ref: "User", index: true },
    attemptNo: { type: Number, required: true, min: 1 },
    status: {
      type: String,
      enum: ["not_started", "in_progress", "submitted", "auto_submitted", "expired"],
      default: "not_started",
      index: true,
    },
    startedAt: { type: Date },
    submittedAt: { type: Date },
    expiresAt: { type: Date, index: true },
    lastActivityAt: { type: Date, default: Date.now, index: true },
    problemStates: { type: [assignedProblemStateSchema], default: [] },
    aggregate: { type: assignedSessionAggregateSchema, default: () => ({}) },
  },
  { timestamps: true, optimisticConcurrency: true },
);

assignedTestSessionSchema.index({ assignmentId: 1, userId: 1, attemptNo: 1 }, { unique: true });
assignedTestSessionSchema.index({ userId: 1, status: 1, updatedAt: -1 });
assignedTestSessionSchema.index({ assignmentId: 1, status: 1 });

export type AssignedTestSessionDocument = InferSchemaType<typeof assignedTestSessionSchema>;
export const AssignedTestSessionModel = model<AssignedTestSessionDocument>(
  "AssignedTestSession",
  assignedTestSessionSchema,
);


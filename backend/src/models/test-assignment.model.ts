import { InferSchemaType, model, Schema, Types } from "mongoose";

const testAssignmentSchema = new Schema(
  {
    testId: { type: Types.ObjectId, required: true, ref: "Test", index: true },
    assignedBy: { type: Types.ObjectId, required: true, ref: "User", index: true },
    targetUsers: [{ type: Types.ObjectId, ref: "User" }],
    targetGroups: [{ type: Types.ObjectId, ref: "Group" }],
    startAt: { type: Date, required: true, index: true },
    dueAt: { type: Date, required: true, index: true },
    allowLate: { type: Boolean, default: false },
    maxAttemptsPerUser: { type: Number, default: 1, min: 1 },
    status: {
      type: String,
      enum: ["scheduled", "active", "closed", "cancelled"],
      default: "scheduled",
      index: true,
    },
    notificationTemplate: { type: String, default: "" },
  },
  { timestamps: true },
);

testAssignmentSchema.index({ testId: 1, status: 1 });
testAssignmentSchema.index({ startAt: 1, dueAt: 1, status: 1 });

export type TestAssignmentDocument = InferSchemaType<typeof testAssignmentSchema>;
export const TestAssignmentModel = model<TestAssignmentDocument>("TestAssignment", testAssignmentSchema);


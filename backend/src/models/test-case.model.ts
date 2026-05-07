import { InferSchemaType, model, Schema, Types } from "mongoose";

const testCaseSchema = new Schema(
  {
    problemId: { type: Types.ObjectId, required: true, ref: "Problem", index: true },
    stdin: { type: String, required: true },
    expectedOutput: { type: String, required: true },
    isHidden: { type: Boolean, default: true, index: true },
    orderIndex: { type: Number, required: true },
    label: { type: String, default: "" },
  },
  { timestamps: true },
);

testCaseSchema.index({ problemId: 1, orderIndex: 1 }, { unique: true });

export type TestCaseDocument = InferSchemaType<typeof testCaseSchema>;
export const TestCaseModel = model<TestCaseDocument>("TestCase", testCaseSchema);


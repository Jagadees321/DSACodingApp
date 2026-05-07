import { InferSchemaType, model, Schema, Types } from "mongoose";

const testSchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    instructions: { type: String, default: "" },
    durationMin: { type: Number, required: true, min: 1 },
    problemIds: [{ type: Types.ObjectId, ref: "Problem", required: true }],
    status: { type: String, enum: ["draft", "published", "archived"], default: "draft", index: true },
    createdBy: { type: Types.ObjectId, required: true, ref: "User", index: true },
    version: { type: Number, default: 1 },
  },
  { timestamps: true },
);

testSchema.index({ status: 1, updatedAt: -1 });
testSchema.index({ createdBy: 1, createdAt: -1 });

export type TestDocument = InferSchemaType<typeof testSchema>;
export const TestModel = model<TestDocument>("Test", testSchema);


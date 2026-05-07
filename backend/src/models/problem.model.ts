import { InferSchemaType, model, Schema } from "mongoose";

const exampleSchema = new Schema(
  {
    input: { type: String, required: true },
    output: { type: String, required: true },
    explanation: { type: String },
  },
  { _id: false },
);

const starterSchema = new Schema(
  { java: { type: String, required: true }, python: { type: String, required: true } },
  { _id: false },
);

const solutionSchema = new Schema(
  { java: { type: String, required: true }, python: { type: String, required: true } },
  { _id: false },
);

const problemSchema = new Schema(
  {
    slug: { type: String, required: true, unique: true, index: true },
    title: { type: String, required: true },
    level: { type: Number, required: true, min: 1, max: 5, index: true },
    difficulty: { type: String, required: true },
    category: { type: String, required: true, index: true },
    description: { type: String, required: true },
    constraints: { type: [String], default: [] },
    examples: { type: [exampleSchema], default: [] },
    tags: { type: [String], default: [] },
    xpReward: { type: Number, default: 50 },
    orderIndex: { type: Number, required: true, index: true },
    isPublished: { type: Boolean, default: true, index: true },
    starter: { type: starterSchema, required: true },
    solution: { type: solutionSchema, required: true },
  },
  { timestamps: true },
);

problemSchema.index({ level: 1, category: 1, orderIndex: 1 });

export type ProblemDocument = InferSchemaType<typeof problemSchema>;
export const ProblemModel = model<ProblemDocument>("Problem", problemSchema);


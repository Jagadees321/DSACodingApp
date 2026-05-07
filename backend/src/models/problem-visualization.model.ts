import { InferSchemaType, model, Schema, Types } from "mongoose";

const problemVisualizationSchema = new Schema(
  {
    problemId: { type: Types.ObjectId, required: true, ref: "Problem", index: true },
    language: { type: String, enum: ["java", "python"], required: true },
    /** SHA-256 hex of slug + language + user source (problem-specific cache key). */
    sourceHash: { type: String, required: true },
    html: { type: String, required: true },
  },
  { timestamps: true },
);

problemVisualizationSchema.index({ problemId: 1, sourceHash: 1 }, { unique: true });

export type ProblemVisualizationDocument = InferSchemaType<typeof problemVisualizationSchema>;
export const ProblemVisualizationModel = model<ProblemVisualizationDocument>(
  "ProblemVisualization",
  problemVisualizationSchema,
);

import { InferSchemaType, model, Schema } from "mongoose";

const fundamentalSchema = new Schema(
  {
    title: { type: String, required: true },
    slug: { type: String, required: true, unique: true, index: true },
    category: { type: String, required: true, index: true },
    summary: { type: String, required: true },
    content: { type: String, required: true },
    relatedProblemSlugs: { type: [String], default: [] },
    orderIndex: { type: Number, required: true, index: true },
    isPublished: { type: Boolean, default: true, index: true },
  },
  { timestamps: true },
);

fundamentalSchema.index({ category: 1, orderIndex: 1 });

export type FundamentalDocument = InferSchemaType<typeof fundamentalSchema>;
export const FundamentalModel = model<FundamentalDocument>("Fundamental", fundamentalSchema);


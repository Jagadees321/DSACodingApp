import { InferSchemaType, model, Schema, Types } from "mongoose";

const userFundamentalSchema = new Schema(
  {
    userId: { type: Types.ObjectId, required: true, ref: "User", index: true },
    fundamentalId: { type: Types.ObjectId, required: true, ref: "Fundamental", index: true },
    isCompleted: { type: Boolean, default: false },
    completedAt: { type: Date },
  },
  { timestamps: true },
);

userFundamentalSchema.index({ userId: 1, fundamentalId: 1 }, { unique: true });

export type UserFundamentalDocument = InferSchemaType<typeof userFundamentalSchema>;
export const UserFundamentalModel = model<UserFundamentalDocument>(
  "UserFundamental",
  userFundamentalSchema,
);


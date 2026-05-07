import { InferSchemaType, model, Schema, Types } from "mongoose";

const userProgressSchema = new Schema(
  {
    userId: { type: Types.ObjectId, required: true, ref: "User", index: true },
    problemId: { type: Types.ObjectId, required: true, ref: "Problem", index: true },
    status: { type: String, enum: ["not_started", "attempted", "solved"], default: "not_started" },
    bestLanguage: { type: String, enum: ["java", "python"], default: "python" },
    attemptsCount: { type: Number, default: 0 },
    xpEarned: { type: Number, default: 0 },
    firstSolvedAt: { type: Date },
    lastAttemptedAt: { type: Date },
  },
  { timestamps: true },
);

userProgressSchema.index({ userId: 1, problemId: 1 }, { unique: true });
userProgressSchema.index({ userId: 1, status: 1 });

export type UserProgressDocument = InferSchemaType<typeof userProgressSchema>;
export const UserProgressModel = model<UserProgressDocument>("UserProgress", userProgressSchema);


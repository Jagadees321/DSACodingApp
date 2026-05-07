import { InferSchemaType, model, Schema } from "mongoose";

const userSchema = new Schema(
  {
    username: { type: String, required: true, unique: true, trim: true, lowercase: true },
    email: { type: String, required: true, unique: true, trim: true, lowercase: true },
    /** Missing for OAuth-only accounts until a password is set (optional future flow). */
    passwordHash: { type: String, required: false },
    googleSub: { type: String, required: false, sparse: true, unique: true },
    githubId: { type: String, required: false, sparse: true, unique: true },
    avatarUrl: { type: String },
    role: { type: String, enum: ["user", "admin"], default: "user", required: true },
    currentLevel: { type: Number, default: 1 },
    totalXp: { type: Number, default: 0 },
    streakDays: { type: Number, default: 0 },
    lastActiveAt: { type: Date },
  },
  { timestamps: true },
);

userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ username: 1 }, { unique: true });

export type UserDocument = InferSchemaType<typeof userSchema>;
export const UserModel = model<UserDocument>("User", userSchema);


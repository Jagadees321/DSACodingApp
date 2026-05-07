import { InferSchemaType, model, Schema, Types } from "mongoose";

const sessionSchema = new Schema(
  {
    _id: { type: String, required: true },
    userId: { type: Types.ObjectId, required: true, ref: "User", index: true },
    tokenHash: { type: String, required: true, index: true },
    ipAddress: { type: String },
    userAgent: { type: String },
    expiresAt: { type: Date, required: true, index: true },
    revokedAt: { type: Date },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

sessionSchema.index({ userId: 1, revokedAt: 1 });
sessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export type SessionDocument = InferSchemaType<typeof sessionSchema>;
export const SessionModel = model<SessionDocument>("Session", sessionSchema);


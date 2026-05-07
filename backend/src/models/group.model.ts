import { InferSchemaType, model, Schema, Types } from "mongoose";

const groupSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    createdBy: { type: Types.ObjectId, required: true, ref: "User", index: true },
    isActive: { type: Boolean, default: true, index: true },
    memberCount: { type: Number, default: 0 },
  },
  { timestamps: true },
);

groupSchema.index({ name: 1 }, { unique: true });

export type GroupDocument = InferSchemaType<typeof groupSchema>;
export const GroupModel = model<GroupDocument>("Group", groupSchema);


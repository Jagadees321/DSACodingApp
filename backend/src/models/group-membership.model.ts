import { InferSchemaType, model, Schema, Types } from "mongoose";

const groupMembershipSchema = new Schema(
  {
    groupId: { type: Types.ObjectId, required: true, ref: "Group", index: true },
    userId: { type: Types.ObjectId, required: true, ref: "User", index: true },
    role: { type: String, enum: ["member", "lead"], default: "member" },
    joinedAt: { type: Date, default: Date.now },
    leftAt: { type: Date },
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true },
);

groupMembershipSchema.index(
  { groupId: 1, userId: 1 },
  { unique: true, partialFilterExpression: { isActive: true } },
);
groupMembershipSchema.index({ userId: 1, isActive: 1 });

export type GroupMembershipDocument = InferSchemaType<typeof groupMembershipSchema>;
export const GroupMembershipModel = model<GroupMembershipDocument>(
  "GroupMembership",
  groupMembershipSchema,
);


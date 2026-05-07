import { InferSchemaType, model, Schema, Types } from "mongoose";

const notificationSchema = new Schema(
  {
    userId: { type: Types.ObjectId, required: true, ref: "User", index: true },
    type: { type: String, enum: ["test_assigned", "test_due_soon", "test_updated"], required: true },
    title: { type: String, required: true },
    body: { type: String, required: true },
    metadata: {
      assignmentId: { type: Types.ObjectId, ref: "TestAssignment" },
      testId: { type: Types.ObjectId, ref: "Test" },
    },
    isRead: { type: Boolean, default: false, index: true },
    readAt: { type: Date },
    createdAt: { type: Date, default: Date.now, index: true },
  },
  { timestamps: false },
);

notificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 });

export type NotificationDocument = InferSchemaType<typeof notificationSchema>;
export const NotificationModel = model<NotificationDocument>("Notification", notificationSchema);


import { Router } from "express";
import { z } from "zod";
import { Types } from "mongoose";
import { requireAuth } from "../../middleware/auth.js";
import { HttpError } from "../../lib/http-error.js";
import { NotificationModel } from "../../models/notification.model.js";

export const notificationsRouter = Router();

notificationsRouter.get("/me", requireAuth, async (req, res) => {
  const query = z
    .object({
      limit: z.coerce.number().int().min(1).max(100).default(30),
      unreadOnly: z.coerce.boolean().default(false),
    })
    .parse(req.query);

  const filter: Record<string, unknown> = { userId: new Types.ObjectId(req.user!.userId) };
  if (query.unreadOnly) filter.isRead = false;

  const notifications = await NotificationModel.find(filter)
    .sort({ createdAt: -1 })
    .limit(query.limit)
    .lean();
  const unreadCount = await NotificationModel.countDocuments({
    userId: new Types.ObjectId(req.user!.userId),
    isRead: false,
  });

  res.json({ ok: true, data: { items: notifications, unreadCount } });
});

notificationsRouter.post("/:id/read", requireAuth, async (req, res) => {
  const id = z.string().regex(/^[a-fA-F0-9]{24}$/).parse(req.params.id);
  const updated = await NotificationModel.findOneAndUpdate(
    { _id: id, userId: new Types.ObjectId(req.user!.userId) },
    { isRead: true, readAt: new Date() },
    { new: true },
  ).lean();
  if (!updated) throw new HttpError(404, "NOT_FOUND", "Notification not found");
  res.json({ ok: true, data: updated });
});


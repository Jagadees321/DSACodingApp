import { Router } from "express";
import { z } from "zod";
import { authRateLimit } from "../../middleware/rate-limit.js";
import { requireAuth } from "../../middleware/auth.js";
import { HttpError } from "../../lib/http-error.js";
import { SessionModel } from "../../models/session.model.js";
import { UserModel } from "../../models/user.model.js";
import {
  issueTokens,
  loginUser,
  registerUser,
  revokeAllUserSessions,
  revokeSessionById,
  rotateRefreshToken,
} from "./auth.service.js";
import { googleOAuthCallback, googleOAuthStart } from "./oauth.handlers.js";

export const authRouter = Router();

const registerSchema = z.object({
  username: z.string().min(3).max(32),
  email: z.string().email(),
  password: z.string().min(8).max(120),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(120),
});

const refreshSchema = z.object({
  refreshToken: z.string().min(20),
});

authRouter.get("/oauth/google/start", authRateLimit, googleOAuthStart);
authRouter.get("/oauth/google/callback", googleOAuthCallback);

authRouter.post("/register", authRateLimit, async (req, res) => {
  const input = registerSchema.parse(req.body);
  const user = await registerUser(input);
  const tokens = await issueTokens({
    userId: user._id,
    role: user.role,
    ipAddress: req.ip,
    userAgent: req.get("user-agent"),
  });

  res.status(201).json({
    ok: true,
    data: {
      user: { id: user._id, username: user.username, email: user.email, role: user.role },
      ...tokens,
    },
  });
});

authRouter.post("/login", authRateLimit, async (req, res) => {
  const input = loginSchema.parse(req.body);
  const user = await loginUser(input);
  const tokens = await issueTokens({
    userId: user._id,
    role: user.role,
    ipAddress: req.ip,
    userAgent: req.get("user-agent"),
  });
  res.json({
    ok: true,
    data: {
      user: { id: user._id, username: user.username, email: user.email, role: user.role },
      ...tokens,
    },
  });
});

authRouter.post("/refresh", authRateLimit, async (req, res) => {
  const { refreshToken } = refreshSchema.parse(req.body);
  const tokens = await rotateRefreshToken(refreshToken);
  res.json({ ok: true, data: tokens });
});

authRouter.post("/logout", requireAuth, async (req, res) => {
  if (!req.user?.sessionId) throw new HttpError(401, "UNAUTHORIZED", "Session not found");
  await revokeSessionById(req.user.sessionId, req.user.userId);
  res.json({ ok: true });
});

authRouter.post("/logout-all", requireAuth, async (req, res) => {
  await revokeAllUserSessions(req.user!.userId);
  res.json({ ok: true });
});

authRouter.get("/me", requireAuth, async (req, res) => {
  const user = await UserModel.findById(req.user!.userId).select("-passwordHash").lean();
  if (!user) throw new HttpError(404, "NOT_FOUND", "User not found");
  res.json({ ok: true, data: user });
});

authRouter.get("/sessions", requireAuth, async (req, res) => {
  const sessions = await SessionModel.find({ userId: req.user!.userId, revokedAt: null })
    .sort({ createdAt: -1 })
    .lean();
  res.json({ ok: true, data: sessions });
});

authRouter.delete("/sessions/:sessionId", requireAuth, async (req, res) => {
  await revokeSessionById(String(req.params.sessionId), req.user!.userId);
  res.json({ ok: true });
});


import argon2 from "argon2";
import jwt from "jsonwebtoken";
import { createHash, randomUUID } from "node:crypto";
import { Types } from "mongoose";
import { env } from "../../config/env.js";
import { HttpError } from "../../lib/http-error.js";
import { SessionModel } from "../../models/session.model.js";
import { UserModel } from "../../models/user.model.js";

type AccessPayload = { userId: string; role: "user" | "admin"; sessionId: string };

function hashToken(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

export async function registerUser(input: { username: string; email: string; password: string }) {
  const existing = await UserModel.findOne({
    $or: [{ email: input.email.toLowerCase() }, { username: input.username.toLowerCase() }],
  });
  if (existing) throw new HttpError(409, "USER_EXISTS", "User already exists");

  const passwordHash = await argon2.hash(input.password);
  const user = await UserModel.create({
    username: input.username.toLowerCase(),
    email: input.email.toLowerCase(),
    passwordHash,
  });
  return user;
}

export async function ensureUniqueUsername(base: string): Promise<string> {
  const cleaned = base
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 28);
  const prefix = cleaned.length >= 3 ? cleaned : "user";
  for (let n = 0; n < 25; n += 1) {
    const candidate =
      n === 0 ? prefix : `${prefix}${Math.floor(1000 + Math.random() * 90000)}`.slice(0, 32);
    const exists = await UserModel.exists({ username: candidate });
    if (!exists) return candidate;
  }
  return `${prefix}${Date.now()}`.slice(0, 32);
}

export async function findOrCreateGoogleUser(profile: {
  sub: string;
  email: string;
  picture?: string;
}) {
  const email = profile.email.trim().toLowerCase();
  if (!email) throw new HttpError(400, "OAUTH_NO_EMAIL", "Google did not return an email");

  let user = await UserModel.findOne({ googleSub: profile.sub });
  if (user) {
    if (profile.picture) {
      user.avatarUrl = profile.picture;
      await user.save();
    }
    return user;
  }

  user = await UserModel.findOne({ email });
  if (user) {
    user.googleSub = profile.sub;
    if (profile.picture) user.avatarUrl = user.avatarUrl ?? profile.picture;
    await user.save();
    return user;
  }

  const base = email.split("@")[0] ?? "user";
  const username = await ensureUniqueUsername(base);
  return UserModel.create({
    username,
    email,
    googleSub: profile.sub,
    avatarUrl: profile.picture,
  });
}

export async function loginUser(input: { email: string; password: string }) {
  const user = await UserModel.findOne({ email: input.email.toLowerCase() });
  if (!user) throw new HttpError(401, "INVALID_CREDENTIALS", "Invalid credentials");
  if (!user.passwordHash) {
    throw new HttpError(401, "INVALID_CREDENTIALS", "Use Google sign-in for this account.");
  }
  const valid = await argon2.verify(user.passwordHash, input.password);
  if (!valid) throw new HttpError(401, "INVALID_CREDENTIALS", "Invalid credentials");
  return user;
}

export async function issueTokens(params: {
  userId: Types.ObjectId;
  role: "user" | "admin";
  ipAddress?: string;
  userAgent?: string;
}) {
  const sessionId = randomUUID();
  const refreshToken = randomUUID() + "." + randomUUID();
  const refreshTokenHash = hashToken(refreshToken);

  const expiresAt = new Date(Date.now() + env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);
  await SessionModel.create({
    _id: sessionId,
    userId: params.userId,
    tokenHash: refreshTokenHash,
    ipAddress: params.ipAddress,
    userAgent: params.userAgent,
    expiresAt,
  });

  const accessPayload: AccessPayload = { userId: String(params.userId), role: params.role, sessionId };
  const accessToken = jwt.sign(accessPayload, env.JWT_ACCESS_SECRET, {
    expiresIn: `${env.ACCESS_TOKEN_TTL_MIN}m`,
  });

  return { accessToken, refreshToken, expiresAt, sessionId };
}

export function verifyAccessToken(token: string) {
  try {
    return jwt.verify(token, env.JWT_ACCESS_SECRET) as AccessPayload;
  } catch {
    throw new HttpError(401, "INVALID_TOKEN", "Invalid or expired access token");
  }
}

export async function rotateRefreshToken(refreshToken: string) {
  const tokenHash = hashToken(refreshToken);
  const session = await SessionModel.findOne({ tokenHash, revokedAt: null });
  if (!session || session.expiresAt.getTime() < Date.now()) {
    throw new HttpError(401, "INVALID_REFRESH_TOKEN", "Invalid refresh token");
  }
  const user = await UserModel.findById(session.userId);
  if (!user) throw new HttpError(401, "INVALID_REFRESH_TOKEN", "Invalid refresh token");

  session.revokedAt = new Date();
  await session.save();

  return issueTokens({
    userId: user._id as Types.ObjectId,
    role: user.role,
  });
}

export async function revokeSessionById(sessionId: string, userId: string) {
  await SessionModel.updateOne({ _id: sessionId, userId }, { revokedAt: new Date() });
}

export async function revokeAllUserSessions(userId: string) {
  await SessionModel.updateMany({ userId, revokedAt: null }, { revokedAt: new Date() });
}


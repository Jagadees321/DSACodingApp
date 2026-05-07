import { NextFunction, Request, Response } from "express";
import { verifyAccessToken } from "../modules/auth/auth.service.js";
import { HttpError } from "../lib/http-error.js";

export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const authHeader = req.header("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    throw new HttpError(401, "UNAUTHORIZED", "Missing bearer token");
  }
  const token = authHeader.slice("Bearer ".length);
  const payload = verifyAccessToken(token);
  req.user = payload;
  next();
}

export function requireAdmin(req: Request, _res: Response, next: NextFunction) {
  if (!req.user) throw new HttpError(401, "UNAUTHORIZED", "Authentication required");
  if (req.user.role !== "admin") throw new HttpError(403, "FORBIDDEN", "Admin access required");
  next();
}

/** Sets `req.user` when a valid Bearer token is present; otherwise continues without auth. */
export function optionalAuth(req: Request, _res: Response, next: NextFunction) {
  const authHeader = req.header("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    next();
    return;
  }
  const token = authHeader.slice("Bearer ".length);
  try {
    req.user = verifyAccessToken(token);
  } catch {
    // Expired or invalid token — public handler still runs without elevated fields.
  }
  next();
}


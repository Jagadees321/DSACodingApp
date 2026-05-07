import { NextFunction, Request, Response } from "express";
import { RateLimiterMemory } from "rate-limiter-flexible";
import { env } from "../config/env.js";
import { HttpError } from "../lib/http-error.js";

const authRateLimiter = new RateLimiterMemory({
  points: env.RATE_LIMIT_POINTS,
  duration: env.RATE_LIMIT_DURATION_SEC,
});

export async function authRateLimit(req: Request, _res: Response, next: NextFunction) {
  try {
    await authRateLimiter.consume(req.ip || "unknown");
    next();
  } catch {
    next(new HttpError(429, "RATE_LIMITED", "Too many requests"));
  }
}


import { NextFunction, Request, Response } from "express";
import { RateLimiterMemory } from "rate-limiter-flexible";
import { HttpError } from "../lib/http-error.js";

const visualizeLimiter = new RateLimiterMemory({
  points: 12,
  duration: 3600,
});

export async function visualizeRateLimit(req: Request, _res: Response, next: NextFunction) {
  try {
    const key = req.user?.userId ? `u:${req.user.userId}` : req.ip || "unknown";
    await visualizeLimiter.consume(key);
    next();
  } catch {
    next(new HttpError(429, "RATE_LIMITED", "Too many visualization requests; try again later"));
  }
}
